// microlens.js — live quasar microlensing on the GPU (WebGL2).
// Inverse ray-shooting: millions of rays from the lens plane are deflected by a field of
// point-mass stars + external shear and binned in the source plane -> magnification map.
// Units: Einstein radius of one star = 1.
//   y1 = (1-γ) x1 - Σ m (x - x_i)/|x - x_i|²
//   y2 = (1+γ) x2 - Σ m (x - x_i)/|x - x_i|²
// With stellar convergence κ*, mean magnification = 1 / ((1-κ*)² - γ²).
(function () {
  const VS_SHOOT = `#version 300 es
  precision highp float;
  uniform vec3 uStars[192]; uniform int uN;
  uniform vec2 uGrid; uniform vec2 uX; uniform float uGamma; uniform float uHalf; uniform vec2 uC;
  flat out int vCh;
  void main() {
    int id = gl_VertexID;
    float i = float(id % int(uGrid.x)), j = float(id / int(uGrid.x));
    vec2 x = (vec2(i, j) + 0.5) / uGrid * 2.0 * uX - uX;
    vec2 a = vec2(0.0);
    for (int k = 0; k < 192; k++) { if (k >= uN) break; vec2 d = x - uStars[k].xy; a += uStars[k].z * d / max(dot(d, d), 1e-7); }
    vec2 y = vec2((1.0 - uGamma) * x.x, (1.0 + uGamma) * x.y) - a;
    gl_Position = vec4((y - uC) / uHalf, 0.0, 1.0); gl_PointSize = 1.0; vCh = id % 4;
  }`;
  const FS_SHOOT = `#version 300 es
  precision highp float; flat in int vCh; out vec4 o;
  void main() { o = vec4(equal(ivec4(vCh), ivec4(0, 1, 2, 3))); }`; // spread over 4 channels: keeps half-floats exact
  const VS_QUAD = `#version 300 es
  out vec2 uv; void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
  // Display pass. The ray counts are smoothed over ~2 pixels (shot noise otherwise reads as grain), then
  // drawn as a continuous ink tone that follows log μ, with the caustics, the thin ridges of highest μ, in amber.
  const FS_SHOW = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform sampler2D uMap; uniform float uNorm, uDpr, uMean; uniform vec3 uBg, uInk, uHot;
  float mu(vec2 p) { vec4 c = texture(uMap, p); return (c.r + c.g + c.b + c.a) / uNorm; }
  void main() {
    vec2 px = 1.0 / vec2(textureSize(uMap, 0)), e = 0.75 * px;
    float m = (2.0 * mu(uv) + mu(uv + vec2(e.x, e.y)) + mu(uv - vec2(e.x, e.y)) + mu(uv + vec2(e.x, -e.y)) + mu(uv - vec2(e.x, -e.y))
             + 0.5 * (mu(uv + vec2(2.0 * px.x, 0.0)) + mu(uv - vec2(2.0 * px.x, 0.0)) + mu(uv + vec2(0.0, 2.0 * px.y)) + mu(uv - vec2(0.0, 2.0 * px.y)))) / 8.0;
    float l = log(max(m / uMean, 1e-3)) / log(10.0);           // log10 of μ relative to its mean
    float wash = 0.42 * pow(smoothstep(-0.75, 0.55, l), 1.6);       // continuous tone, no dots
    float caus = smoothstep(0.32, 0.62, l);
    vec3 col = mix(uBg, uInk, wash);
    o = vec4(mix(col, uHot, caus * 0.95), 1.0);
  }`;
  // Light-curve pass: Gaussian-weighted magnification over each band's disk (pixel 0 = blue, 1 = red)
  const FS_LC = `#version 300 es
  precision highp float; out vec4 o;
  uniform sampler2D uMap; uniform float uNorm; uniform vec2 uSrc; uniform vec2 uSig; uniform float uHalf; uniform vec2 uC;
  void main() {
    float sig = gl_FragCoord.x < 1.0 ? uSig.x : uSig.y;
    ivec2 s = textureSize(uMap, 0); float px = 2.0 * uHalf / float(s.x);
    float acc = 0.0, wsum = 0.0;
    for (int i = -12; i <= 12; i++) for (int j = -12; j <= 12; j++) {
      vec2 off = vec2(float(i), float(j)) / 12.0 * 2.5 * sig;
      vec2 q = (uSrc - uC + off + uHalf) / px;
      ivec2 p = clamp(ivec2(q), ivec2(0), s - 1);
      vec4 c = texelFetch(uMap, p, 0);
      float w = exp(-0.5 * dot(off, off) / (sig * sig));
      acc += w * (c.r + c.g + c.b + c.a); wsum += w;
    }
    o = vec4(acc / wsum / uNorm, 0.0, 0.0, 1.0);
  }`;

  function compile(gl, vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace('[0]', ''); u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

  class Microlens {
    constructor(canvas, o = {}) {
      this.kappa = o.kappa ?? 0.45; this.gamma = o.gamma ?? 0.3;
      this.half = o.half ?? 2.2; this.res = o.res ?? 384;
      const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
      if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('WebGL2 float render targets unavailable');
      this.gl = gl; this.canvas = canvas;
      // Lens-plane region that maps onto the source window (+ margin for scattered rays)
      const a1 = Math.abs(1 - this.kappa - this.gamma), a2 = Math.abs(1 - this.kappa + this.gamma);
      this.X = [this.half / a1 + 2.5, this.half / a2 + 2.5];
      const rays = o.rays ?? 6e6, aspect = this.X[0] / this.X[1];
      this.grid = [Math.round(Math.sqrt(rays * aspect)), Math.round(Math.sqrt(rays / aspect))];
      this.nRays = this.grid[0] * this.grid[1];
      // Stars: uniform in a circle that covers the shooting region; κ* = N / R² for unit masses
      const R = Math.hypot(this.X[0], this.X[1]) + 3;
      this.Rstar = R;
      this.N = Math.min(192, Math.round(this.kappa * R * R));
      this.kappa = this.N / (R * R);
      let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      this.stars = [];
      for (let i = 0; i < this.N; i++) {
        const r = R * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
        this.stars.push({ x0: r * Math.cos(a), y0: r * Math.sin(a), m: 1, amp: 0.25 + rnd() * 0.5, w: 0.05 + rnd() * 0.12, ph: rnd() * 6.28, ph2: rnd() * 6.28 });
      }
      this.starBuf = new Float32Array(192 * 3);
      // Mean rays per source pixel if unlensed... times the mean magnification gives the macro level
      this.view(this.half, 0, 0);
      this.muMean = 1 / ((1 - this.kappa) ** 2 - this.gamma ** 2);

      this.pShoot = compile(gl, VS_SHOOT, FS_SHOOT);
      this.pShow = compile(gl, VS_QUAD, FS_SHOW);
      this.pLC = compile(gl, VS_QUAD.replace('out vec2 uv;', '').replace(' uv = p;', ''), FS_LC);
      this.vao = gl.createVertexArray();
      this.map = this.target(this.res, this.res, gl.RGBA16F, gl.HALF_FLOAT, gl.LINEAR);
      this.lc = this.target(2, 1, gl.RGBA32F, gl.FLOAT);
      this.lcOut = new Float32Array(8);
      this.colors = { bg: hex(o.bg || '#0a0a0a'), ink: hex(o.ink || '#ede9df'), hot: hex(o.hot || '#f2b45a') };
    }
    // Source-plane window that the map shows: centre (cx, cy), half-width h (≤ the half given at construction)
    view(h, cx, cy) {
      this.half = h; this.cx = cx; this.cy = cy;
      this.norm = this.nRays / (4 * this.X[0] * this.X[1]) * (2 * h / this.res) ** 2; // unlensed rays per map pixel
    }
    target(w, h, fmt, type, filter) {
      const gl = this.gl, tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, gl.RGBA, type, null);
      const f = filter || gl.NEAREST; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fb, w, h };
    }
    starPos(i, t) { const s = this.stars[i]; return [s.x0 + s.amp * Math.sin(s.w * t + s.ph), s.y0 + s.amp * Math.cos(s.w * 0.8 * t + s.ph2)]; }
    // Recompute the magnification map for star-time t
    shoot(t) {
      const gl = this.gl, P = this.pShoot;
      for (let i = 0; i < this.N; i++) { const [x, y] = this.starPos(i, t); this.starBuf.set([x, y, this.stars[i].m], i * 3); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.map.fb); gl.viewport(0, 0, this.res, this.res);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(P.p); gl.bindVertexArray(this.vao);
      gl.uniform3fv(P.u.uStars, this.starBuf); gl.uniform1i(P.u.uN, this.N);
      gl.uniform2f(P.u.uGrid, this.grid[0], this.grid[1]); gl.uniform2f(P.u.uX, this.X[0], this.X[1]);
      gl.uniform1f(P.u.uGamma, this.gamma); gl.uniform1f(P.u.uHalf, this.half); gl.uniform2f(P.u.uC, this.cx, this.cy);
      gl.drawArrays(gl.POINTS, 0, this.nRays);
      gl.disable(gl.BLEND);
    }
    show() {
      const gl = this.gl, P = this.pShow, c = this.canvas;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, c.width, c.height);
      gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.map.tex);
      gl.uniform1i(P.u.uMap, 0); gl.uniform1f(P.u.uNorm, this.norm);
      gl.uniform1f(P.u.uDpr, Math.min(devicePixelRatio || 1, 2)); gl.uniform1f(P.u.uMean, this.muMean);
      gl.uniform3fv(P.u.uBg, this.colors.bg); gl.uniform3fv(P.u.uInk, this.colors.ink); gl.uniform3fv(P.u.uHot, this.colors.hot);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // Magnification of a Gaussian source of width sigBlue / sigRed centred at src -> [μ_blue, μ_red]
    lightCurve(src, sigBlue, sigRed) {
      const gl = this.gl, P = this.pLC;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.lc.fb); gl.viewport(0, 0, 2, 1);
      gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.map.tex);
      gl.uniform1i(P.u.uMap, 0); gl.uniform1f(P.u.uNorm, this.norm); gl.uniform1f(P.u.uHalf, this.half); gl.uniform2f(P.u.uC, this.cx, this.cy);
      gl.uniform2f(P.u.uSrc, src[0], src[1]); gl.uniform2f(P.u.uSig, sigBlue, sigRed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.readPixels(0, 0, 2, 1, gl.RGBA, gl.FLOAT, this.lcOut);
      return [this.lcOut[0], this.lcOut[4]];
    }
    // Sanity check: mean magnification over the central half of the map (edges lose rays)
    measuredMean() {
      const gl = this.gl, buf = new Float32Array(this.res * this.res * 4);
      // read via a float32 copy pass is overkill; RGBA16F readback as FLOAT is allowed with EXT_color_buffer_float
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.map.fb); gl.readPixels(0, 0, this.res, this.res, gl.RGBA, gl.FLOAT, buf);
      let s = 0, n = 0; const q = this.res / 4;
      for (let y = q; y < 3 * q; y++) for (let x = q; x < 3 * q; x++) { const k = (y * this.res + x) * 4; s += buf[k] + buf[k + 1] + buf[k + 2] + buf[k + 3]; n++; }
      return s / n / this.norm;
    }
  }
  window.Microlens = Microlens;
})();
