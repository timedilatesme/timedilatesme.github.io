// lensart.js — stippled galaxies and ray-traced lensed arcs.
// Galaxies are point clouds whose density follows the surface brightness ("pencil stippling").
// Lensed images use the real lens equation for a singular isothermal sphere + external shear:
//   β = θ − θE θ/|θ| − Γ θ,   Γ = γ [[cos2φ, sin2φ], [sin2φ, −cos2φ]]
// Surface brightness is conserved, so an image-plane point is kept with probability I_src(β).
(function () {
  const TAU = Math.PI * 2;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
  function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r()); }

  // Elliptical (de Vaucouleurs-like) galaxy as a mixture of Gaussians, 3D (oblate)
  const MOG = [[0.30, 0.05], [0.30, 0.14], [0.24, 0.38], [0.16, 0.95]]; // [weight, σ/Re]
  function elliptical3d(n, { re = 1, q = 0.7, seed = 1 } = {}) {
    const r = rng(seed), pts = [];
    for (let i = 0; i < n; i++) {
      let u = r(), k = 0; while (k < 3 && u > MOG[k][0]) { u -= MOG[k][0]; k++; }
      const s = MOG[k][1] * re;
      pts.push([gauss(r) * s * q, gauss(r) * s * q, gauss(r) * s, 0.5 + 0.5 * r()]);
    }
    return pts;
  }
  // Spiral galaxy: bulge + exponential disk with logarithmic arms + star-forming knots, in the local x–z plane
  function spiral3d(n, { h = 0.35, arms = 2, pitch = 0.32, seed = 2, knots = 14 } = {}) {
    const r = rng(seed), pts = [], tanp = Math.tan(pitch);
    for (let i = 0; i < n; i++) {
      const u = r();
      if (u < 0.18) { const s = h * 0.25; pts.push([gauss(r) * s, gauss(r) * s * 0.5, gauss(r) * s, 0.9]); continue; }
      const rad = -h * Math.log((r() + 1e-9) * (r() + 1e-9)); // Gamma(2): exponential disk
      let ang;
      if (u < 0.8) { const k = Math.floor(r() * arms); ang = Math.log(rad / (h * 0.3) + 1e-6) / tanp + k * TAU / arms + gauss(r) * 0.28; }
      else ang = r() * TAU;
      pts.push([Math.cos(ang) * rad, gauss(r) * h * 0.04, Math.sin(ang) * rad, 0.4 + 0.4 * r()]);
    }
    for (let k = 0; k < knots; k++) { // bright clumps along the arms
      const rad = h * (0.6 + r() * 2.2), arm = Math.floor(r() * arms), ang = Math.log(rad / (h * 0.3)) / tanp + arm * TAU / arms;
      for (let j = 0; j < 14; j++) pts.push([Math.cos(ang) * rad + gauss(r) * h * 0.06, 0, Math.sin(ang) * rad + gauss(r) * h * 0.06, 1]);
    }
    return pts;
  }
  // Source-plane surface brightness of a face-on-ish spiral (unnormalised, peak ~1)
  function spiralSB(x, y, { h = 0.12, arms = 2, pitch = 0.35, rot = 0, q = 0.75 }) {
    const c = Math.cos(rot), s = Math.sin(rot), xr = x * c + y * s, yr = (-x * s + y * c) / q;
    const rad = Math.hypot(xr, yr), phi = Math.atan2(yr, xr);
    let arm = 0;
    for (let k = 0; k < arms; k++) {
      let d = phi - (Math.log(rad / (h * 0.3) + 1e-6) / Math.tan(pitch) + k * TAU / arms);
      d = ((d % TAU) + TAU + Math.PI) % TAU - Math.PI;
      arm = Math.max(arm, Math.exp(-d * d / 0.18));
    }
    return Math.exp(-rad * rad / (2 * (h * 0.35) ** 2)) + 0.75 * arm * Math.exp(-rad / h);
  }
  function deflect(x, y, thetaE, gamma, gphi) {
    const r = Math.hypot(x, y) + 1e-9, c = Math.cos(2 * gphi), s = Math.sin(2 * gphi);
    return [x - thetaE * x / r - gamma * (c * x + s * y), y - thetaE * y / r - gamma * (s * x - c * y)];
  }
  // Ray-traced stipple of a lensed extended source. Returns [x, y, brightness] in image-plane units.
  function lensedArcs({ thetaE = 1, gamma = 0.06, gphi = 0.3, src = {}, n = 160000, keep = 4500, rmax = 1.9, seed = 5 }) {
    const r = rng(seed), pts = [], { x: bx = 0.06, y: by = 0.03 } = src;
    const peak = spiralSB(0, 0, src);
    for (let i = 0; i < n && pts.length < keep; i++) {
      const rad = rmax * thetaE * Math.sqrt(r()), a = r() * TAU, x = rad * Math.cos(a), y = rad * Math.sin(a);
      const [u, v] = deflect(x, y, thetaE, gamma, gphi);
      const I = spiralSB(u - bx, v - by, src) / peak;
      if (r() < I * 1.6) pts.push([x, y, Math.min(1, I * 1.5)]);
    }
    return pts;
  }
  // Images of a point source (quasar): grid search for minima of |β(θ) − β_s|, then Newton polish.
  function pointImages({ thetaE = 1, gamma = 0.12, gphi = 0.3, bx = 0.05, by = 0.03 }) {
    const N = 360, L = 2.2 * thetaE, d = new Float32Array(N * N), out = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -L + 2 * L * i / (N - 1), y = -L + 2 * L * j / (N - 1), [u, v] = deflect(x, y, thetaE, gamma, gphi);
      d[j * N + i] = Math.hypot(u - bx, v - by);
    }
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const k = j * N + i, v = d[k]; if (v > 0.05) continue;
      if (v <= d[k - 1] && v <= d[k + 1] && v <= d[k - N] && v <= d[k + N] && v <= d[k - N - 1] && v <= d[k + N + 1]) {
        let x = -L + 2 * L * i / (N - 1), y = -L + 2 * L * j / (N - 1);
        for (let it = 0; it < 20; it++) { // Newton with numerical Jacobian
          const e = 1e-5, f = deflect(x, y, thetaE, gamma, gphi), fx = deflect(x + e, y, thetaE, gamma, gphi), fy = deflect(x, y + e, thetaE, gamma, gphi);
          const a = (fx[0] - f[0]) / e, b = (fy[0] - f[0]) / e, c = (fx[1] - f[1]) / e, dd = (fy[1] - f[1]) / e, det = a * dd - b * c;
          const rx = f[0] - bx, ry = f[1] - by; x -= (dd * rx - b * ry) / det; y -= (-c * rx + a * ry) / det;
        }
        const e = 1e-5, f = deflect(x, y, thetaE, gamma, gphi), fx = deflect(x + e, y, thetaE, gamma, gphi), fy = deflect(x, y + e, thetaE, gamma, gphi);
        const det = ((fx[0] - f[0]) * (fy[1] - f[1]) - (fy[0] - f[0]) * (fx[1] - f[1])) / (e * e);
        if (Math.hypot(x, y) > 0.05 && !out.some(p => Math.hypot(p.x - x, p.y - y) < 0.02)) out.push({ x, y, mu: 1 / det });
      }
    }
    return out.sort((p, q) => Math.abs(q.mu) - Math.abs(p.mu));
  }
  // Live lensed arcs: fixed image-plane sample points with their source-plane positions β precomputed.
  // Each frame a point is drawn if a fixed per-point threshold is below the source brightness at β,
  // so the arcs re-form as the source moves without the dots flickering.
  class LiveLens {
    constructor({ thetaE = 1, gamma = 0.05, gphi = 0.5, n = 40000, r0 = 0.25, r1 = 2, seed = 41 } = {}) {
      const r = rng(seed); this.n = n;
      this.x = new Float32Array(n); this.y = new Float32Array(n); this.u = new Float32Array(n); this.v = new Float32Array(n); this.k = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const rad = thetaE * Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * r()), a = r() * TAU, x = rad * Math.cos(a), y = rad * Math.sin(a);
        const [u, v] = deflect(x, y, thetaE, gamma, gphi);
        this.x[i] = x; this.y[i] = y; this.u[i] = u; this.v[i] = v; this.k[i] = r();
      }
    }
    // Source brightness (normalised, sharpened) tabulated on a grid in the source's own frame;
    // rotation is applied per point, so a turning source costs no extra.
    table(src) {
      const key = [src.h, src.arms, src.pitch, src.q].join();
      if (this.key === key) return this.tab;
      const N = 256, h = src.h || 0.12, L = h * 5, t = new Float32Array(N * N), base = { ...src, x: 0, y: 0, rot: 0 }, peak = spiralSB(0, 0, base);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) t[j * N + i] = Math.pow(spiralSB(-L + 2 * L * (i + 0.5) / N, -L + 2 * L * (j + 0.5) / N, base) / peak, 1.4);
      this.key = key; return (this.tab = { t, N, L });
    }
    // src: {x, y, h, arms, pitch, rot, q}; draws into ctx at (cx, cy) with `scale` px per unit
    draw(ctx, src, cx, cy, scale, { color = '#ece6d6', alpha = 1, size = 1.2, gain = 1.6 } = {}) {
      const { t, N, L } = this.table(src), { x: bx = 0, y: by = 0, rot = 0 } = src, c = Math.cos(rot), sn = Math.sin(rot), k = N / (2 * L);
      ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.beginPath();
      for (let i = 0; i < this.n; i++) {
        const du = this.u[i] - bx, dv = this.v[i] - by;
        if (du > L || du < -L || dv > L || dv < -L) continue;
        const gx = ((du * c + dv * sn) + L) * k | 0, gy = ((-du * sn + dv * c) + L) * k | 0;
        if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue;
        if (this.k[i] < t[gy * N + gx] * gain) ctx.rect(cx + this.x[i] * scale, cy + this.y[i] * scale, size, size);
      }
      ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  // Screen-space elliptical galaxy stipple for 2D scenes
  function elliptical2d(n, { re = 1, q = 0.72, phi = 0.4, seed = 3 } = {}) {
    const r = rng(seed), pts = [], c = Math.cos(phi), s = Math.sin(phi);
    for (let i = 0; i < n; i++) {
      let u = r(), k = 0; while (k < 3 && u > MOG[k][0]) { u -= MOG[k][0]; k++; }
      const sg = MOG[k][1] * re, x = gauss(r) * sg, y = gauss(r) * sg * q;
      pts.push([x * c - y * s, x * s + y * c, 0.45 + 0.55 * r()]);
    }
    return pts;
  }
  // Draw 2D stipple: pts in model units, placed at (cx, cy) with `scale` px per unit. Boils with `seed`.
  function draw2d(ctx, pts, cx, cy, scale, { color = '#ece6d6', alpha = 1, size = 1.3, seed = 1, jitter = 0 } = {}) {
    ctx.fillStyle = color;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], h = ((i * 2654435761 + seed * 40503) >>> 0) / 4294967296, h2 = ((i * 40503 + seed * 2654435761) >>> 0) / 4294967296;
      ctx.globalAlpha = alpha * p[2];
      ctx.fillRect(cx + p[0] * scale + (h - .5) * jitter * 2, cy + p[1] * scale + (h2 - .5) * jitter * 2, size, size);
    }
    ctx.globalAlpha = 1;
  }
  window.LA = { LiveLens, elliptical3d, spiral3d, elliptical2d, lensedArcs, pointImages, draw2d, deflect, spiralSB };
})();
