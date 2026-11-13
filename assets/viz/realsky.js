// realsky.js — realistic-looking lens images, ray-traced on the GPU.
// Same lens equation as lensart.js (isothermal sphere + external shear), but the light is modelled the way
// real images look:
//   · galaxies are Sérsic profiles (deflector: n≈4 elliptical, red-orange; sources: n≈1 disks, blue, with
//     at most a couple of faint star-forming knots),
//   · quasars and supernovae are point images, drawn as the point-spread function (PSF),
//   · everything is blurred by one Gaussian PSF (seeing) and colour-stretched with an asinh curve
//     (Lupton et al. 2004), as in the colour composites made from survey images.
// Three passes: ray-trace the sharp sky into a float texture, blur it (separable Gaussian, horizontal then
// vertical; skipped when the PSF is under a pixel), then add the point images and apply the stretch.
// One shared WebGL2 context; RS.render(w, h, scene) returns a canvas valid until the next call, RS.bake copies it.
// scene (CSS px, y down): {
//   cx, cy, scale            image-plane origin and px per unit (units: θE of a typical lens ≈ 1)
//   psf                      PSF σ in px (0 = sharp)
//   defl: { re, n, q, phi, amp, color }
//   sources: [{ lens: { thetaE, gamma, gphi }, x, y, re, n, q, phi, amp, color, knots,      (up to 2)
//               bulge, bcolor, arms, pitch, seed }]  bulge: bulge-to-disk weight; arms: 0 for no spiral arms
//   points:  [{ x, y, amp }] with pointColor (point images at their image positions; up to 6). amp is the peak
//            for a PSF of σ ≤ 1.1 px; a wider PSF spreads the same flux, so the peak drops as 1/σ²
//   stretch, Q               asinh stretch (defaults suit these scenes)
// }
(function () {
  // the light model of a galaxy (shared with hero.js, which ray-traces it in 3D)
  const GLSL_GALAXY = `
  float sersicR(float R, float re, float n) { float b = 2.0 * n - 0.327; return exp(-b * (pow(R / re, 1.0 / n) - 1.0)); }
  float sersic(vec2 p, float re, float n, float q, float phi) {
    float c = cos(phi), s = sin(phi); vec2 r = vec2(p.x * c + p.y * s, (-p.x * s + p.y * c) / q);
    return sersicR(sqrt(dot(r, r) + 0.0004 * re * re), re, n);
  }
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  // A source galaxy as real ones look in colour images: a warm bulge, a bluer disk with logarithmic spiral
  // arms, and compact blue star-forming knots strung along the arms (scattered at random in an irregular).
  //   S = (x, y, re, n)  S2 = (q, phi, amp, knots)  S3 = (bulge, arms, pitch, seed)
  vec3 galaxy(vec2 b, vec4 S, vec4 S2, vec4 S3, vec3 cDisk, vec3 cBulge) {
    float re = S.z, c = cos(S2.y), s = sin(S2.y);
    vec2 r = vec2(b.x * c + b.y * s, (-b.x * s + b.y * c) / S2.x); // the disk's own plane (inclination squashes it)
    float R = sqrt(dot(r, r) + 0.0004 * re * re), th = atan(r.y, r.x), arms = S3.y, tp = tan(S3.z);
    float arm = 1.0;
    if (arms > 0.5) {
      float ph = arms * (th - log(R / (0.35 * re)) / tp);
      arm = mix(1.0, 0.35 + 1.7 * pow(0.5 + 0.5 * cos(ph), 2.0), smoothstep(0.25 * re, 0.9 * re, R));
    }
    // the old stars of the inner disk are warm; young stars in the outer disk and arms are blue
    float disk = sersicR(R, re, S.w);
    vec3 col = disk * (mix(cDisk, mix(cBulge, cDisk, smoothstep(0.15 * re, 1.3 * re, R)), min(1.0, 3.0 * S3.x)) * 0.7 * min(arm, 1.0) + cDisk * max(arm - 1.0, 0.0) * 0.9);
    float kn = 0.0;
    for (int j = 0; j < 14; j++) {
      float sd = S3.w * 17.0 + float(j) * 7.31, rj = re * (0.35 + 1.5 * hash(sd));
      float tj = arms > 0.5 ? log(rj / (0.35 * re)) / tp + 6.2832 * floor(hash(sd + 1.0) * arms) / arms + 0.35 * (hash(sd + 2.0) - 0.5)
                            : 6.2832 * hash(sd + 1.0);
      vec2 d = r - rj * vec2(cos(tj), sin(tj)); float sj = re * (0.045 + 0.05 * hash(sd + 3.0));
      kn += (0.3 + hash(sd + 4.0)) * exp(-dot(d, d) / (2.0 * sj * sj)) * exp(-rj / (1.6 * re));
    }
    col += mix(cDisk, vec3(0.78, 0.86, 1.0), 0.5) * S2.w * 3.0 * kn;
    if (S3.x > 0.0) { // bulge: rounder than the disk, compact, warm
      vec2 rb = vec2(b.x * c + b.y * s, (-b.x * s + b.y * c) / min(1.0, S2.x + 0.35));
      col += cBulge * S3.x * 14.0 * exp(-length(rb) / (0.09 * re));
    }
    return col * S2.z;
  }
`;
  const VS = `#version 300 es
  void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
  // pass 1: the sharp sky, linear light, 2×2 supersampled
  const FS_SKY = `#version 300 es
  precision highp float; out vec4 o;
  uniform vec2 uRes, uC; uniform float uScale, uDpr;
  uniform int uNs; uniform vec4 uL[2], uS[2], uS2[2], uS3[2]; uniform vec3 uSC[2], uSB[2];
  uniform vec4 uD; uniform float uDA; uniform vec3 uDC;
${GLSL_GALAXY}  vec2 deflect(vec2 t, vec4 L) {
    float r = length(t) + 1e-6, c = cos(2.0 * L.z), s = sin(2.0 * L.z);
    return t - L.x * t / r - L.y * vec2(c * t.x + s * t.y, s * t.x - c * t.y);
  }
  vec3 sky(vec2 t) {
    vec3 c = uDC * uDA * sersic(t, uD.x, uD.y, uD.z, uD.w);
    for (int k = 0; k < 2; k++) {
      if (k >= uNs) break;
      c += galaxy(deflect(t, uL[k]) - uS[k].xy, uS[k], uS2[k], uS3[k], uSC[k], uSB[k]);
    }
    return c;
  }
  void main() {
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr; vec3 c = vec3(0.0);
    for (int i = 0; i < 4; i++) { vec2 d = (vec2(i % 2, i / 2) - 0.5) * 0.5 / uDpr; c += sky((px + d - uC) / uScale); }
    o = vec4(c * 0.25, 1.0);
  }`;
  // pass 2: one direction of a separable Gaussian blur (σ in device px)
  const FS_BLUR = `#version 300 es
  precision highp float; out vec4 o;
  uniform sampler2D uTex; uniform vec2 uDir; uniform float uSig;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy), sz = textureSize(uTex, 0); int R = int(min(ceil(3.0 * uSig), 120.0));
    vec3 acc = vec3(0.0); float ws = 0.0;
    for (int i = -120; i <= 120; i++) {
      if (i < -R || i > R) continue;
      ivec2 q = clamp(p + i * ivec2(uDir), ivec2(0), sz - 1); float w = exp(-0.5 * float(i * i) / (uSig * uSig));
      acc += w * texelFetch(uTex, q, 0).rgb; ws += w;
    }
    o = vec4(acc / ws, 1.0);
  }`;
  // pass 3: point images (PSF-shaped, flux-conserving), asinh stretch, sky subtraction
  const FS_OUT = `#version 300 es
  precision highp float; out vec4 o;
  uniform sampler2D uTex; uniform vec2 uRes, uC; uniform float uScale, uDpr, uPsf, uQ, uStretch;
  uniform int uNp; uniform vec4 uP[6]; uniform vec3 uPC;
  void main() {
    vec3 c = texelFetch(uTex, ivec2(gl_FragCoord.xy), 0).rgb;
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
    float s = max(uPsf, 1.1), norm = (1.1 * 1.1) / (s * s);
    for (int i = 0; i < 6; i++) {
      if (i >= uNp) break;
      vec2 d = px - (uC + uP[i].xy * uScale); float r2 = dot(d, d);
      c += uPC * uP[i].z * norm * (exp(-r2 / (2.0 * s * s)) + 0.06 / pow(1.0 + r2 / (9.0 * s * s), 2.0));
    }
    float I = (c.r + c.g + c.b) / 3.0;
    vec3 col = I > 1e-6 ? c * (asinh(uQ * uStretch * I) / uQ) / I : vec3(0.0);
    col = clamp(col - 0.015, 0.0, 1.0) / 0.985; col = pow(col, vec3(0.9)); // sky subtraction: faint wings go to black
    o = vec4(col, max(col.r, max(col.g, col.b)));
  }`;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  // colours of real galaxies in gri composites
  const COL = { lrg: '#ffc98a', blue: '#8fb4ff', red: '#ff9a80', host: '#ffb39a', qso: '#dfe8ff', sn: '#fff1cf', bulge: '#ffd8a6' };
  let gl = null, canvas = null, P = {}, T = [], TW = 0, TH = 0;
  function program(fs, names) {
    const p = gl.createProgram();
    for (const [t, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(p, s);
    }
    gl.linkProgram(p); const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n); return { p, u };
  }
  function init() {
    canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('WebGL2 float render targets unavailable');
    P.sky = program(FS_SKY, ['uRes', 'uC', 'uScale', 'uDpr', 'uNs', 'uL', 'uS', 'uS2', 'uS3', 'uSC', 'uSB', 'uD', 'uDA', 'uDC']);
    P.blur = program(FS_BLUR, ['uTex', 'uDir', 'uSig']);
    P.out = program(FS_OUT, ['uTex', 'uRes', 'uC', 'uScale', 'uDpr', 'uPsf', 'uQ', 'uStretch', 'uNp', 'uP', 'uPC']);
    gl.bindVertexArray(gl.createVertexArray());
  }
  function targets(W, H) { // two float render targets the size of the output
    if (W === TW && H === TH) return;
    for (const t of T) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
    T = [0, 1].map(() => {
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null);
      for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fb };
    });
    TW = W; TH = H;
  }
  function pass(prog, src, dst) {
    gl.useProgram(prog.p); gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
    if (src) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(prog.u.uTex, 0); }
  }
  function render(w, h, sc) {
    if (!gl) init();
    const d = Math.min(devicePixelRatio || 1, 2), W = Math.max(1, Math.round(w * d)), H = Math.max(1, Math.round(h * d));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    targets(W, H); gl.viewport(0, 0, W, H);
    // 1 · sharp sky
    const S = sc.sources || [], L = [], A = [], B = [], C = [], E = [], F = [], D = sc.defl || { amp: 0 }, u = P.sky.u;
    for (let k = 0; k < 2; k++) {
      const s = S[k] || {}, l = s.lens || {};
      L.push(l.thetaE || 0, l.gamma || 0, l.gphi || 0, 0);
      A.push(s.x || 0, s.y || 0, s.re || 0.1, s.n || 1);
      B.push(s.q || 0.7, s.phi || 0, s.amp ?? 1, s.knots ?? 0.3);
      C.push(...hex(s.color || COL.blue));
      E.push(s.bulge ?? 0, s.arms ?? 0, s.pitch ?? 0.5, s.seed ?? k + 1); F.push(...hex(s.bcolor || COL.bulge));
    }
    pass(P.sky, null, T[0]);
    gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uC, sc.cx, sc.cy); gl.uniform1f(u.uScale, sc.scale); gl.uniform1f(u.uDpr, d);
    gl.uniform1i(u.uNs, Math.min(2, S.length)); gl.uniform4fv(u.uL, L); gl.uniform4fv(u.uS, A); gl.uniform4fv(u.uS2, B); gl.uniform4fv(u.uS3, E); gl.uniform3fv(u.uSC, C); gl.uniform3fv(u.uSB, F);
    gl.uniform4f(u.uD, D.re || 0.4, D.n || 4, D.q || 0.75, D.phi || 0); gl.uniform1f(u.uDA, D.amp ?? 0); gl.uniform3fv(u.uDC, hex(D.color || COL.lrg));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 2 · seeing (σ in device px)
    let src = T[0];
    const sig = (sc.psf || 0) * d;
    if (sig >= 0.7) {
      pass(P.blur, T[0], T[1]); gl.uniform2f(P.blur.u.uDir, 1, 0); gl.uniform1f(P.blur.u.uSig, sig); gl.drawArrays(gl.TRIANGLES, 0, 3);
      pass(P.blur, T[1], T[0]); gl.uniform2f(P.blur.u.uDir, 0, 1); gl.uniform1f(P.blur.u.uSig, sig); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // 3 · points, stretch, to the canvas
    const pts = (sc.points || []).slice(0, 6), PP = [], o = P.out.u;
    for (let i = 0; i < 6; i++) { const q = pts[i] || {}; PP.push(q.x || 0, q.y || 0, q.amp || 0, 0); }
    pass(P.out, src, null); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(o.uRes, W, H); gl.uniform2f(o.uC, sc.cx, sc.cy); gl.uniform1f(o.uScale, sc.scale); gl.uniform1f(o.uDpr, d);
    gl.uniform1f(o.uPsf, sc.psf || 0); gl.uniform1f(o.uQ, sc.Q ?? 8); gl.uniform1f(o.uStretch, sc.stretch ?? 1);
    gl.uniform1i(o.uNp, pts.length); gl.uniform4fv(o.uP, PP); gl.uniform3fv(o.uPC, hex(sc.pointColor || COL.qso));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return canvas;
  }
  function bake(w, h, sc) {
    const src = render(w, h, sc), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0); return c;
  }
  // draw straight onto a 2D context at (x, y)
  function draw(ctx, x, y, w, h, sc, alpha = 1) {
    const img = render(w, h, sc); ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(img, x, y, w, h); ctx.restore();
  }
  // An unlensed galaxy filling a px×px square, face-on (squash it when drawing to incline it), with the
  // same light model as the lensed sources: kind 'spiral' | 'elliptical' | 'irregular'.
  function galaxy(px, kind, o = {}) {
    const k = px / 2, base = { cx: k, cy: k, scale: k, psf: 0, stretch: o.stretch ?? 2.4 };
    // galaxy light has no edge: fade the square to nothing towards its rim, so no corner ever shows
    const vignette = c => { const g = c.getContext('2d'), W = c.width, r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
      r.addColorStop(0.55, 'rgba(0,0,0,1)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'destination-in'; g.fillStyle = r; g.fillRect(0, 0, W, W); return c; };
    if (kind === 'elliptical') return vignette(bake(px, px, { ...base, defl: { re: o.re ?? 0.22, n: 4, q: o.q ?? 0.8, phi: o.phi || 0, amp: o.amp ?? 0.5, color: o.color || COL.lrg } }));
    const irr = kind === 'irregular';
    return vignette(bake(px, px, { ...base, sources: [{ lens: {}, x: 0, y: 0, re: o.re ?? (irr ? 0.2 : 0.26), n: irr ? 0.8 : 1, q: o.q ?? 1, phi: o.phi || 0,
      amp: o.amp ?? 1.6, color: o.color || COL.blue, knots: o.knots ?? (irr ? 1 : 0.5), bulge: irr ? 0 : o.bulge ?? 0.3,
      bcolor: o.bcolor, arms: irr ? 0 : o.arms ?? 2, pitch: o.pitch ?? 0.5, seed: o.seed ?? 1 }] }));
  }
  window.RS = { render, bake, draw, galaxy, COL, GLSL_GALAXY, hex };
})();
