// smooth.js — continuous (grain-free) rendering of galaxies and lensed arcs on the GPU.
// Every pixel is ray-traced through the same lens equation as lensart.js (isothermal sphere + shear):
//   β = θ − θE θ/|θ| − Γ θ
// and coloured by the source's surface brightness at β (2×2 supersampled), so arcs are smooth light.
// One shared WebGL2 context renders into an offscreen canvas; callers drawImage the result straight away.
//   LG.render(w, h, scene)  -> canvas (valid until the next render)
//   LG.bake(w, h, scene)    -> a 2D canvas copy, for static images
//   LG.sprite(kind, px, o)  -> a baked, unlensed galaxy, for drawing as a billboard in 3D scenes
// scene: { cx, cy, scale (px per unit), sources: [{ lens:{thetaE,gamma,gphi}, src:{x,y,h,rot,arms,pitch,q}, color, gain }],
//          defl: { re, q, phi, color, amp } }      (coordinates in CSS px; y down, as on a 2D canvas)
(function () {
  const FS = `#version 300 es
  precision highp float; out vec4 o;
  uniform vec2 uRes, uC; uniform float uScale, uDpr; uniform int uNs;
  uniform vec4 uL[2], uS[2], uS2[2]; uniform vec3 uCol[2];
  uniform vec4 uD; uniform vec3 uDCol;
  float spiral(vec2 p, vec4 S, vec4 S2) {
    float h = S.z, c = cos(S.w), s = sin(S.w);
    float xr = p.x * c + p.y * s, yr = (-p.x * s + p.y * c) / S2.z;
    float r = length(vec2(xr, yr)), ph = atan(yr, xr), arm = 0.0;
    for (int k = 0; k < 3; k++) {
      if (float(k) >= S2.x) break;
      float d = ph - (log(r / (h * 0.3) + 1e-6) / tan(S2.y) + float(k) * 6.28318 / S2.x);
      d = mod(d + 3.14159, 6.28318) - 3.14159; arm = max(arm, exp(-d * d / 0.18));
    }
    return exp(-r * r / (2.0 * h * h * 0.1225)) + 0.75 * arm * exp(-r / h) * smoothstep(0.0, 0.5 * h, r);
  }
  vec2 deflect(vec2 t, vec4 L) {
    float r = length(t) + 1e-6, c = cos(2.0 * L.z), s = sin(2.0 * L.z);
    return t - L.x * t / r - L.y * vec2(c * t.x + s * t.y, s * t.x - c * t.y);
  }
  float elliptical(vec2 p) { // mixture of Gaussians ≈ de Vaucouleurs, as in lensart.js
    float c = cos(uD.z), s = sin(uD.z); vec2 q = vec2(p.x * c + p.y * s, (-p.x * s + p.y * c) / uD.y) / uD.x;
    float r2 = dot(q, q);
    return 0.30 * exp(-r2 / 0.005) + 0.30 * exp(-r2 / 0.0392) / 2.0 + 0.24 * exp(-r2 / 0.289) / 5.0 + 0.16 * exp(-r2 / 1.805) / 12.0;
  }
  void main() {
    vec3 acc = vec3(0.0);
    for (int sx = 0; sx < 2; sx++) for (int sy = 0; sy < 2; sy++) {
      vec2 f = gl_FragCoord.xy + (vec2(sx, sy) - 0.5) * 0.5;
      vec2 t = (vec2(f.x, uRes.y - f.y) / uDpr - uC) / uScale;
      for (int k = 0; k < 2; k++) {
        if (k >= uNs) break;
        float I = spiral(deflect(t, uL[k]) - uS[k].xy, uS[k], uS2[k]);
        acc += uCol[k] * (1.0 - exp(-uS2[k].w * I));
      }
      if (uD.w > 0.0) acc += uDCol * (1.0 - exp(-uD.w * elliptical(t)));
    }
    acc *= 0.25; o = vec4(acc, max(acc.r, max(acc.g, acc.b)));
  }`;
  const VS = `#version 300 es
  void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  let gl = null, P = null, U = {}, canvas = null;
  function init() {
    canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    P = gl.createProgram();
    for (const [t, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
      const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(P, s);
    }
    gl.linkProgram(P);
    for (const n of ['uRes', 'uC', 'uScale', 'uDpr', 'uNs', 'uL', 'uS', 'uS2', 'uCol', 'uD', 'uDCol']) U[n] = gl.getUniformLocation(P, n);
    gl.bindVertexArray(gl.createVertexArray());
  }
  function render(w, h, sc) {
    if (!gl) init();
    const d = Math.min(devicePixelRatio || 1, 2), W = Math.max(1, Math.round(w * d)), H = Math.max(1, Math.round(h * d));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(P);
    const S = sc.sources || [], L = [], A = [], B = [], C = [];
    for (let k = 0; k < 2; k++) {
      const s = S[k] || { lens: {}, src: {} }, l = s.lens || {}, q = s.src || {};
      L.push(l.thetaE || 0, l.gamma || 0, l.gphi || 0, 0);
      A.push(q.x || 0, q.y || 0, q.h || 0.12, q.rot || 0);
      B.push(q.arms || 2, q.pitch || 0.35, q.q || 0.75, s.gain ?? 1.6);
      C.push(...hex(s.color || '#ede9df'));
    }
    const D = sc.defl;
    gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uC, sc.cx, sc.cy); gl.uniform1f(U.uScale, sc.scale); gl.uniform1f(U.uDpr, d);
    gl.uniform1i(U.uNs, Math.min(2, S.length));
    gl.uniform4fv(U.uL, L); gl.uniform4fv(U.uS, A); gl.uniform4fv(U.uS2, B); gl.uniform3fv(U.uCol, C);
    gl.uniform4f(U.uD, D ? D.re : 1, D ? D.q ?? 0.75 : 1, D ? D.phi || 0 : 0, D ? D.amp ?? 2.2 : 0); gl.uniform3fv(U.uDCol, hex(D && D.color || '#efe2c4'));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return canvas;
  }
  function bake(w, h, sc) {
    const src = render(w, h, sc), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0); return c;
  }
  // an unlensed galaxy filling a px×px square: kind 'spiral' (face-on; squash it when drawing) or 'elliptical'
  function sprite(kind, px, o = {}) {
    const k = px / 2;
    if (kind === 'elliptical') return bake(px, px, { cx: k, cy: k, scale: k, defl: { re: 0.42, q: o.q ?? 1, phi: 0, color: o.color, amp: o.amp ?? 6 } });
    return bake(px, px, { cx: k, cy: k, scale: k, sources: [{ lens: {}, src: { h: 0.2, arms: o.arms || 2, pitch: o.pitch || 0.35, q: 1 }, color: o.color, gain: o.gain ?? 3.2 }] });
  }
  // draw a baked sprite at screen point (x, y), radius rr px, rotated by `rot` and squashed by `q` (inclination)
  function blit(ctx, img, x, y, rr, { rot = 0, q = 1, spin = 0, alpha = 1 } = {}) {
    if (rr < 0.3 || alpha <= 0.01) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, q); ctx.rotate(spin);
    ctx.drawImage(img, -rr, -rr, 2 * rr, 2 * rr); ctx.restore();
  }
  // a sprite placed in a sketch3d scene: world centre c, world radius R. With `normal`, it is a thin disk
  // seen at the right inclination; without, a billboard.
  function blit3d(sk, img, c, R, { normal, spin = 0, alpha = 1 } = {}) {
    const q0 = sk.project(c); if (!q0) return null;
    const f = (sk.h / 2) / Math.tan(sk.cam.fov / 2), rr = R * f / q0[2];
    let rot = 0, q = 1;
    if (normal) {
      const e = R * 0.3, q1 = sk.project([c[0] + normal[0] * e, c[1] + normal[1] * e, c[2] + normal[2] * e]);
      if (q1) { const vx = q1[0] - q0[0], vy = q1[1] - q0[1], L = e * f / q0[2]; q = Math.sqrt(Math.max(0.04, 1 - (vx * vx + vy * vy) / (L * L))); rot = Math.atan2(vy, vx) - Math.PI / 2; }
    }
    const a = alpha * Math.max(0.15, Math.min(1, 1.25 - q0[2] / 40));
    blit(sk.ctx, img, q0[0], q0[1], rr, { rot, q, spin, alpha: a });
    if (sk.audit && a > 0.2) sk.audit.push({ x: q0[0] - rr * 0.5, y: q0[1] - rr * 0.5, w: rr, h: rr, name: 'galaxy', obj: true }); // its bright inner half
    return q0;
  }
  window.LG = { render, bake, sprite, blit, blit3d };
})();
