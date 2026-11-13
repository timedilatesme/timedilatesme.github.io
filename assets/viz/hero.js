// hero.js — the home page figure: a lens with two sources, ray-traced live in 3D.
// Every pixel sends a light ray from the camera. At its closest approach to the lens galaxy the ray is bent
// (a singular isothermal sphere, cored and truncated so it falls off far away), then it travels on until it
// crosses the disk of a source galaxy, whose light (a real Hubble image laid on the disk) it picks up.
// From the observer's position the three galaxies line up and the sources appear as Einstein rings. Drag,
// and the camera moves off that line of sight: the rings break into arcs, then separate images, and from the
// side the three galaxies stand apart in space. Release, and it glides back.
// The scene is compressed along the line of sight (distances not to scale), but it is one consistent geometry:
// nothing is swapped between views, every frame is traced.
// Every galaxy is real, from the Hubble Ultra Deep Field (NASA, ESA, S. Beckwith (STScI) and the HUDF Team, CC BY 4.0;
// made by tools/hudf_atlas.py): the lens is an elliptical, each source a cutout laid on its disk, and behind them a
// patch of the field itself, lensed like everything else.
//   Hero.mount(canvas, { reduced })
(function () {
  const { clamp, lerp } = S3, BLUE = '#7fb2ff', RED = '#ff7b63';
  // ---------- the scene (x is the observer's line of sight) ----------
  // Observer at x = −6, lens at 0, sources at 3 and 5.6. Einstein angles θE = α̂·D_ds/D_s give 0.1 and 0.145 rad:
  // a ratio of 1.45, as in the real "Jackpot" lens SDSS J0946+1006.
  const ALPHA = 0.3, CORE = 0.02, TRUNC = 1.0; // truncation just outside the outer ring (b ≈ θE·D_d ≈ 0.87)
  const LENS = { tile: 2, r: 1.05, amp: 1.5 };           // the elliptical's cutout, half-width r, facing the camera
  const SKY = { x: 10, r: 4.2, amp: 1.3 };                // the background field: a plane at x, 2r across
  const unit = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
  // tile: which atlas cutout; r: half-width of the cutout on the sky (scene units); amp: brightness; spin: turns it in its disk.
  // The nearer source is a blue, clumpy disk and the farther one a red one, as the site's colours say.
  const SRC = [ // each source sits a little off the line of sight
    { p: [3, 0.081, 0.036], n: unit([-0.62, 0.3, -0.72]), tile: 0, r: 0.4, amp: 2.2, spin: 0.3, label: 'nearer source', lc: BLUE },
    { p: [5.6, -0.348, 0.162], n: unit([-0.55, -0.25, -0.8]), tile: 1, r: 0.44, amp: 2.4, spin: 1.9, label: 'farther source', lc: RED },
  ];
  const ALL = SRC, NS = ALL.length;
  const TARGET = [2.4, 0, 0], RADIUS = 8.4; // the camera orbits this point; on the axis it sits at the observer

  const FS = `#version 300 es
  precision highp float; out vec4 o;
  uniform vec2 uRes; uniform vec3 uC, uF, uR, uU; uniform float uTan, uSS;
  uniform vec3 uS[${NS}], uN[${NS}], uE[${NS}]; uniform vec4 uT[${NS}]; uniform sampler2D uTex, uSky; uniform float uPix;
  uniform vec4 uLens, uSkyP; uniform vec3 uDefl;
  vec3 lensImg;                                   // the lens galaxy, kept as Hubble's own image shows it (see main)
  vec3 trace(vec3 d) {
    vec3 c = vec3(0.0), P = uC, d2 = d;
    float t = dot(-uC, d);                       // lens at the origin: closest approach along the ray
    vec3 b = uC + d * t; float bl = max(length(b), 1e-5);
    if (t > 0.0) {
      // the lens galaxy's own light: the elliptical's image, facing the camera, read where the ray passes closest
      vec2 lu = vec2(dot(b, uR), dot(b, uU)) / uLens.y;
      // (the published image saturates the core and flattens the halo: steepen it so the light falls off as an elliptical's does)
      if (max(abs(lu.x), abs(lu.y)) < 1.0) {
        vec3 px = textureLod(uTex, vec2(uLens.x + lu.x * 0.5 + 0.5, lu.y * 0.5 + 0.5) / vec2(3.0, 1.0), log2(max(t * uPix * 128.0 / uLens.y, 1.0)) + 1.0).rgb; // +1: a touch smoother than the raw pixels
        float m = max(px.r, max(px.g, px.b)); lensImg += px * m * m * uLens.z;
      }
      // deflection towards the lens: α̂ inside the truncation radius, falling off as 1/b beyond, cored at the centre
      float a = uDefl.x * bl / sqrt(bl * bl + uDefl.y * uDefl.y) * min(1.0, uDefl.z / bl);
      P = b; d2 = normalize(d - a * b / bl);
    }
    for (int k = 0; k < ${NS}; k++) {
      vec3 n = uN[k], S = uS[k];
      // the source plane is crossed either before the bend (camera to closest approach) or after it
      float tA = dot(S - uC, n) / dot(d, n), tB = dot(S - P, n) / dot(d2, n);
      vec3 Q; float mu, L; bool hit = false;            // L: path length, to pick the texture's level of detail
      if (t > 0.0 && tA > 0.0 && tA < t) { Q = uC + d * tA; mu = abs(dot(d, n)); L = tA; hit = true; }
      else if (t > 0.0 && tB > 0.0) { Q = P + d2 * tB; mu = abs(dot(d2, n)); L = t + tB; hit = true; }
      else if (t <= 0.0 && tA > 0.0) { Q = uC + d * tA; mu = abs(dot(d, n)); L = tA; hit = true; }
      if (!hit) continue;
      vec4 T = uT[k];                                   // atlas column, row, half-width, brightness
      vec3 q = Q - S, e1 = uE[k], e2 = cross(n, e1);
      vec2 uv = vec2(dot(q, e1), dot(q, e2)) / T.z;     // -1..1 across the cutout
      if (max(abs(uv.x), abs(uv.y)) > 1.0) continue;    // outside the galaxy
      float lod = log2(max(L * uPix * 128.0 / (T.z * max(mu, 0.2)), 1.0));
      vec3 px = textureLod(uTex, (T.xy + uv * 0.5 + 0.5) / vec2(3.0, 1.0), lod).rgb;
      c += pow(px, vec3(2.2)) * T.w / max(mu, 0.35);    // the image's own stretch undone; a thin disk seen edge-on looks brighter
    }
    // the background field, a plane facing the observer far behind (crossed after the bend, or straight if the ray misses the lens)
    vec3 O = t > 0.0 ? P : uC, D = t > 0.0 ? d2 : d;
    if (D.x > 1e-4) {
      float tS = (uSkyP.x - O.x) / D.x;
      vec2 su = (O + D * tS).yz / uSkyP.y;
      float m = max(abs(su.x), abs(su.y));
      if (tS > 0.0 && m < 1.0) {
        float L = (t > 0.0 ? t : 0.0) + tS, lod = log2(max(L * uPix * 512.0 / (uSkyP.y * max(D.x, 0.2)), 1.0));
        c += pow(textureLod(uSky, su * 0.5 + 0.5, lod).rgb, vec3(2.2)) * uSkyP.z * smoothstep(1.0, 0.85, m);
      }
    }
    return c;
  }
  void main() {
    vec3 c = vec3(0.0); int n = int(uSS); lensImg = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      if (i >= n * n) break;
      vec2 j = n > 1 ? (vec2(i % 2, i / 2) - 0.5) * 0.5 : vec2(0.0);
      vec2 ndc = ((gl_FragCoord.xy + j) / uRes) * 2.0 - 1.0;
      c += trace(normalize(uF + ndc.x * uTan * (uRes.x / uRes.y) * uR + ndc.y * uTan * uU));
    }
    c /= float(n * n); lensImg /= float(n * n);
    float I = (c.r + c.g + c.b) / 3.0, Q = 8.0;   // asinh stretch and sky subtraction, as in realsky.js
    vec3 col = I > 1e-6 ? c * (asinh(Q * I) / Q) / I : vec3(0.0);
    col = clamp(col - 0.015, 0.0, 1.0) / 0.985; col = pow(col, vec3(0.9));
    col = 1.0 - (1.0 - col) * (1.0 - clamp(lensImg, 0.0, 1.0)); // the elliptical in front, in its image's own colours
    o = vec4(col, max(col.r, max(col.g, col.b)));
  }`;
  const VS = `#version 300 es
  void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

  function mount(canvas, { reduced = false } = {}) {
    const ctx = canvas.getContext('2d'), gc = document.createElement('canvas');
    const gl = gc.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(prog, s);
    }
    gl.linkProgram(prog); gl.useProgram(prog); gl.bindVertexArray(gl.createVertexArray());
    const U = n => gl.getUniformLocation(prog, n), flat = a => a.flat();
    // the galaxies never change: set them once
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const e1 = g => { // a direction in the disk, turned by the galaxy's spin
      const a = unit(Math.abs(g.n[1]) < 0.9 ? [g.n[2], 0, -g.n[0]] : [0, g.n[2], -g.n[1]]), b = cross(g.n, a);
      return a.map((v, i) => v * Math.cos(g.spin) + b[i] * Math.sin(g.spin));
    };
    gl.uniform3fv(U('uS'), flat(ALL.map(g => g.p))); gl.uniform3fv(U('uN'), flat(ALL.map(g => g.n))); gl.uniform3fv(U('uE'), flat(ALL.map(e1)));
    // the Hubble images: the figure appears once both have loaded
    let loaded = 0, ready = false;
    const texture = (unitN, file, name) => {
      const tex = gl.createTexture(), img = new Image();
      img.onload = () => {
        gl.activeTexture(gl.TEXTURE0 + unitN); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, w, gl.CLAMP_TO_EDGE);
        gl.uniform1i(U(name), unitN); ready = ++loaded === 2; last = '';
      };
      img.src = Site.url('assets/img/' + file);
    };
    texture(0, 'hudf-galaxies.jpg', 'uTex'); texture(1, 'hudf-sky.jpg', 'uSky');
    gl.uniform4fv(U('uT'), flat(ALL.map(g => [g.tile, 0, g.r, g.amp])));
    gl.uniform4f(U('uLens'), LENS.tile, LENS.r, LENS.amp, 0); gl.uniform4f(U('uSkyP'), SKY.x, SKY.r, SKY.amp, 0); gl.uniform3f(U('uDefl'), ALPHA, CORE, TRUNC);

    // camera: yaw and pitch away from the observer's line of sight (0, 0 = the observer)
    const cam = { yaw: 0, pitch: 0 }, goal = { yaw: 0, pitch: 0 };
    let drag = null, released = 0, last = '';
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: goal.yaw, pitch: goal.pitch }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      goal.yaw = clamp(drag.yaw + (e.clientX - drag.x) * 0.006, -1.45, 1.45);
      goal.pitch = clamp(drag.pitch - (e.clientY - drag.y) * 0.004, -0.8, 0.8);
    });
    const end = () => { if (drag) released = performance.now(); drag = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('keydown', e => { // keyboard: arrows turn, Escape returns
      const k = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
      if (k) { goal.yaw = clamp(goal.yaw + k[0], -1.45, 1.45); goal.pitch = clamp(goal.pitch + k[1], -0.8, 0.8); released = performance.now(); e.preventDefault(); }
      if (e.key === 'Escape') { goal.yaw = 0; goal.pitch = 0; }
    });

    function basis() {
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const back = [-cp * cy, sp, -cp * sy]; // from the target towards the camera
      const C = TARGET.map((t, i) => t + RADIUS * back[i]), F = back.map(v => -v);
      const R = unit([-F[2], 0, F[0]]), Up = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
      return { C, F, R, Up };
    }
    function project(p, B, tan, w, h) { // world point -> canvas px (for the labels)
      const v = p.map((x, i) => x - B.C[i]), z = v[0] * B.F[0] + v[1] * B.F[1] + v[2] * B.F[2]; if (z <= 0) return null;
      const x = (v[0] * B.R[0] + v[1] * B.R[1] + v[2] * B.R[2]) / (z * tan * w / h), y = (v[0] * B.Up[0] + v[1] * B.Up[1] + v[2] * B.Up[2]) / (z * tan);
      return [(x + 1) / 2 * w, (1 - y) / 2 * h];
    }
    function draw(ms) {
      if (!drag && released && ms - released > 1600) {
        goal.yaw = lerp(goal.yaw, 0, 0.05); goal.pitch = lerp(goal.pitch, 0, 0.05);
        if (Math.abs(goal.yaw) + Math.abs(goal.pitch) < 1e-3) { goal.yaw = goal.pitch = 0; released = 0; }
      }
      const k = reduced ? 1 : 0.16; cam.yaw = lerp(cam.yaw, goal.yaw, k); cam.pitch = lerp(cam.pitch, goal.pitch, k);
      if (Math.abs(cam.yaw - goal.yaw) < 1e-4) cam.yaw = goal.yaw;
      if (Math.abs(cam.pitch - goal.pitch) < 1e-4) cam.pitch = goal.pitch;
      const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2), W = Math.round(r.width * d), H = Math.round(r.height * d);
      const moving = !!drag || cam.yaw !== goal.yaw || cam.pitch !== goal.pitch, key = [W, H, cam.yaw.toFixed(5), cam.pitch.toFixed(5), moving, ready].join();
      if (key === last || !ready) return; last = key; // nothing changed: keep the last frame
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      // full resolution, 2×2 supersampled, when still; lighter while moving
      const scale = moving ? 0.6 : 1, gw = Math.max(1, Math.round(W * scale)), gh = Math.max(1, Math.round(H * scale));
      if (gc.width !== gw || gc.height !== gh) { gc.width = gw; gc.height = gh; }
      const off = Math.hypot(cam.yaw, cam.pitch), tan = Math.tan(lerp(0.25, 0.42, clamp(off / 1.2, 0, 1))); // widen the view as it turns
      const B = basis();
      gl.viewport(0, 0, gw, gh);
      gl.uniform2f(U('uRes'), gw, gh); gl.uniform3fv(U('uC'), B.C); gl.uniform3fv(U('uF'), B.F); gl.uniform3fv(U('uR'), B.R); gl.uniform3fv(U('uU'), B.Up);
      gl.uniform1f(U('uTan'), tan); gl.uniform1f(U('uPix'), 2 * tan / gh); gl.uniform1f(U('uSS'), moving ? 1 : 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(gc, 0, 0, W, H);
      // off the line of sight, mark the two sources
      const la = clamp((off - 0.25) / 0.3, 0, 1);
      if (la > 0) {
        ctx.setTransform(d, 0, 0, d, 0, 0); ctx.font = '12px "IBM Plex Sans", sans-serif'; ctx.lineWidth = 1;
        // each label takes the first of four spots (away from the other source first, above, then below) that stays on
        // the plate and clears the other label and the other galaxy; with no such spot it is left out
        const qs = SRC.map(s => project(s.p, B, tan, r.width, r.height)), placed = [];
        const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
        SRC.forEach((s, i) => {
          const q = qs[i], o = qs[1 - i]; if (!q) return;
          const w = ctx.measureText(s.label).width, away = o ? q[0] < o[0] : q[0] > r.width * 0.62;
          for (const [left, dy] of [[away, -1], [away, 1], [!away, -1], [!away, 1]]) {
            const dx = left ? -1 : 1, x1 = q[0] + dx * 22, y1 = q[1] + dy * 26, tx = x1 + dx * 14;
            const box = left ? [tx - w - 4, y1 - 10, x1 + 2, y1 + 8] : [x1 - 2, y1 - 10, tx + w + 4, y1 + 8];
            if (box[0] < 8 || box[2] > r.width - 8 || box[1] < 10 || box[3] > r.height - 8) continue;
            if (placed.some(b => hit(b, box)) || (o && hit([o[0] - 14, o[1] - 14, o[0] + 14, o[1] + 14], box))) continue;
            placed.push(box);
            ctx.globalAlpha = 0.9 * la; ctx.strokeStyle = ctx.fillStyle = s.lc;
            ctx.beginPath(); ctx.moveTo(q[0] + dx * 8, q[1] + dy * 9); ctx.lineTo(x1, y1); ctx.lineTo(x1 + dx * 10, y1); ctx.stroke();
            ctx.textAlign = left ? 'right' : 'left'; ctx.fillText(s.label, tx, y1 + 4);
            break;
          }
        });
        ctx.globalAlpha = 1;
      }
    }
    return { draw };
  }
  window.Hero = { mount };
})();
