// slsim.js — "III · SLSim": from a population of galaxies to survey images, static and variable.
// Illustration only: the galaxies, lenses and light curves are toy models drawn here, not SLSim output.
// Steps (p in [0,4)):
//   0  a light cone filling with galaxies (deflectors and sources at many distances)
//   1  the camera moves behind the observer; the few aligned pairs light up (strong lenses)
//   2  zoom into one of them -> the same few lenses as three observatories would image them (realsky.js):
//      Rubin LSST from the ground, Euclid and Roman from space. The lensed quasar flickers, the supernova goes off
//   3  time domain: a lensed supernova; its images brighten one after another, light curves below
(function () {
  const { G, clamp, lerp, ease } = S3;
  const AMBER = '#f2b45a';
  const win = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
  const r = rng(77), XMAX = 26, OPEN = 0.28; // cone: radius = OPEN * distance

  // ---------- the light cone ----------
  // A mixed population, drawn as smooth sprites in realistic colours: ellipticals (round to flattened, orange
  // to yellow-white), spirals (two or three arms, loose or tight, a yellow bulge in a blue disk, seen at any
  // inclination) and clumpy blue irregulars (realsky.js). Intrinsic sizes vary too.
  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    const G_ = RS.galaxy; // the same light model as the lensed sources (realsky.js), unlensed and face-on
    const ell = [[1, '#ffc98a'], [0.8, '#ffd3a0'], [0.62, '#ffbf80'], [0.9, '#ffe0b8'], [0.7, '#ffcf95']].map(([q, color]) => G_(64, 'elliptical', { q, color, re: 0.18, amp: 0.45 }));
    const disk = [[2, 0.45, '#a9c2ff'], [2, 0.55, '#bccdf5'], [3, 0.42, '#9fbaff'], [2, 0.35, '#c5d2f7'], [3, 0.6, '#b2c6ff']].map(([arms, pitch, color], i) => G_(96, 'spiral', { arms, pitch, color, seed: i + 1, bulge: 0.15 + 0.1 * i }));
    const irr = ['#9ec0ff', '#b0b8ff', '#a6d0ff'].map((color, i) => G_(64, 'irregular', { color, seed: 20 + i }));
    return (SPR = { ell, disk, irr, src: G_(96, 'spiral', { seed: 11, bulge: 0.2 }), lens: G_(96, 'elliptical', { q: 0.75, re: 0.2, amp: 0.6 }) });
  }
  const unit = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
  const GAL = [];
  for (let i = 0; i < 180; i++) {
    const x = Math.max(2.5, XMAX * Math.cbrt(r())), rad = OPEN * x * Math.sqrt(r()), a = r() * Math.PI * 2, u = r();
    GAL.push({ c: [x, rad * Math.cos(a), rad * Math.sin(a)], kind: u < 0.33 ? 'ell' : u < 0.85 ? 'disk' : 'irr', v: Math.floor(r() * 5),
      size: 0.45 + 0.6 * r() * r(), bulge: 0.25 + 0.35 * r(), n: unit([r() - 0.5, r() - 0.5, r() - 0.5]), spin: r() * 6, rot: r() * 6 });
  }
  // strong lenses: a deflector, and a source almost exactly behind it as seen from the observer
  const PAIRS = [];
  for (let i = 0; i < 8; i++) {
    const x = 5 + r() * 11, rad = OPEN * x * Math.sqrt(r()) * 0.8, a = r() * Math.PI * 2, k = 1.4 + r() * 0.8;
    const d = [x, rad * Math.cos(a), rad * Math.sin(a)], s = [d[0] * k, d[1] * k + 0.04, d[2] * k];
    PAIRS.push({ d, s, n: unit([r() - 0.5, r() - 0.5, r() - 0.5]), spin: r() * 6 });
  }
  PAIRS.sort((a, b) => a.d[0] - b.d[0]);
  const ZOOM = PAIRS[2]; // the lens the camera dives into (it becomes tile 1 of the mosaic)

  const focal = sk => (sk.h / 2) / Math.tan(sk.cam.fov / 2), fade = q => Math.max(0.15, Math.min(1, 1.25 - q[2] / 40));
  function scene(sk, p, A) {
    const fill = ease(win(p, 0.0, 0.85)) * XMAX + 0.01, pick = ease(win(p, 1.05, 1.6)), dim = 1 - 0.6 * pick, S = sprites();
    // the cone: its far rim and four edges, faint
    sk.stroke(G.ring([XMAX, 0, 0], OPEN * XMAX, { rz: Math.PI / 2, n: 80 }), { alpha: 0.2 * A, width: 0.9, rough: 0.5, passes: 1 });
    for (let i = 0; i < 4; i++) { const a = (i + 0.5) / 4 * Math.PI * 2; sk.stroke(G.line([0, 0, 0], [XMAX, Math.cos(a) * OPEN * XMAX, Math.sin(a) * OPEN * XMAX], 20), { alpha: 0.14 * A, width: 0.9, rough: 0.4, passes: 1 }); }
    for (const g of GAL) {
      const a = clamp((fill - g.c[0]) / 2, 0, 1) * A * dim; if (a < 0.02) continue;
      if (g.kind === 'ell') { const q = sk.project(g.c); if (q) LG.blit(sk.ctx, S.ell[g.v], q[0], q[1], 1.35 * g.size * focal(sk) / q[2], { rot: g.rot, alpha: a * fade(q) }); }
      else if (g.kind === 'irr') LG.blit3d(sk, S.irr[g.v % 3], g.c, g.size * 0.9, { normal: g.n, spin: g.spin, alpha: a });
      else LG.blit3d(sk, S.disk[g.v], g.c, g.size * 1.15, { normal: g.n, spin: g.spin, alpha: a });
    }
    for (const q of PAIRS) {
      const a = clamp((fill - q.s[0]) / 2, 0, 1) * A; if (a < 0.02) continue;
      LG.blit3d(sk, S.lens, q.d, 0.6, { alpha: a });
      LG.blit3d(sk, S.src, q.s, 0.6, { normal: q.n, spin: q.spin, alpha: a });
      if (pick > 0) sk.stroke(G.line([0, 0, 0], q.s, 30), { color: AMBER, alpha: 0.7 * A * pick, width: 1, rough: 0.4, passes: 1, draw: pick });
    }
    sk.strokes(G.sphere([0, 0, 0], 0.32, { lat: 3, lon: 4 }), { alpha: 0.7 * A * (1 - pick) });
  }

  // ---------- lens systems (one set of rules for every tile: see realsky.js) ----------
  const C = RS.COL;
  // observatories SLSim simulates out of the box (rows of the grid). psf: Gaussian σ in units of a typical θE ≈ 1″;
  // FWHM ≈ 0.7″ (LSST median seeing), 0.17″ (Euclid VIS), 0.13″ (Roman at 1.5 µm). Colours: how each one's
  // colour composites tend to look (Roman sees in the infrared, so blue arcs come out less blue).
  // tint: how that observatory's colour images shift each galaxy's own colour (mixed toward this, by this much)
  const OBS = [
    { name: 'RUBIN LSST', sub: 'ground · 0.7″', psf: 0.3, tint: ['#ffffff', 0] },
    { name: 'EUCLID', sub: 'space · 0.17″', psf: 0.072, tint: ['#ffffff', 0.35] },
    { name: 'ROMAN', sub: 'space · 0.13″', psf: 0.055, tint: ['#ffc8a0', 0.3] },
  ];
  const mix = (h1, h2, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h1.slice(i, i + 2), 16) * (1 - t) + parseInt(h2.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
  const L = (E, g, f) => ({ thetaE: E, gamma: g, gphi: f });
  // sources: clumpy star-forming disks, r_e ≈ 0.1–0.2 θE (a few kpc at z ≈ 1–2)
  const gal = (lens, x, y, o = {}) => { const g = { lens, x, y, re: 0.11, n: 1, q: 0.6, phi: 0.8, amp: 1.1, color: C.blue, knots: 0.5, bulge: 0.04, seed: Math.round(Math.abs(x * 71 + y * 37)) + 1, ...o }; return { ...g, re: g.re * 1.35 }; };
  // real lens galaxies are extended: their light reaches the Einstein ring (r_e ≈ 0.6–1 θE, as in SLACS), so sizes
  // given below are scaled up here, with the surface brightness scaled down to match
  const defl = (o = {}) => { const d = { re: 0.32, n: 4, q: 0.75, phi: 0.5, amp: 0.28, ...o }; return { ...d, re: d.re * 2.1, amp: d.amp * 0.33 }; };
  // Fermat potential (SIS + shear): differences between images give the time delays
  function fermat(lens, b, x, y) {
    const c = Math.cos(2 * lens.gphi), s = Math.sin(2 * lens.gphi);
    return 0.5 * ((x - b.x) ** 2 + (y - b.y) ** 2) - lens.thetaE * Math.hypot(x, y) - 0.5 * lens.gamma * (c * (x * x - y * y) + 2 * s * x * y);
  }
  function points(lens, b) { // images of a point source, with magnifications and relative delays (0 = first to arrive)
    const im = LA.pointImages({ ...lens, bx: b.x, by: b.y }), f = im.map(p => fermat(lens, b, p.x, p.y)), f0 = Math.min(...f);
    return im.map((p, i) => ({ ...p, delay: f[i] - f0 }));
  }
  const SPEC = [
    { lens: L(1.0, 0.05, 0.5), defl: defl({ color: '#ffc98a' }), src: [gal(L(1.0, 0.05, 0.5), 0.32, 0.08, { re: 0.12, n: 0.8, knots: 0.6, color: '#8fb4ff' })] },
    { lens: L(0.85, 0.1, 1.2), defl: defl({ re: 0.34, q: 0.65, phi: 1.6 }), src: [gal(L(0.85, 0.1, 1.2), -0.16, 0.1, { re: 0.09, q: 0.5, phi: 2.2 })] },
    { lens: L(1.1, 0.06, 0.2), defl: defl({ q: 0.85, phi: 0.2, re: 0.28, color: '#ffb877' }), qso: { x: 0.06, y: -0.04 } },
    { lens: L(0.95, 0.07, 2.4), defl: defl({ phi: 2.4, q: 0.58, re: 0.42, color: '#ffd09a' }), src: [gal(L(0.95, 0.07, 2.4), 0.36, -0.1, { re: 0.15, n: 1.4, q: 0.4, phi: 0.3, knots: 0.05, color: '#aab2ff' })] },
    { lens: L(1.2, 0.04, 1.2), defl: defl({ re: 0.48, q: 0.7, phi: 1.2 }), src: [gal(L(1.2, 0.04, 1.2), -0.18, 0.08, { re: 0.13, q: 0.5, phi: 2.0 }), gal(L(1.6, 0.04, 1.2), 0.1, 0.12, { re: 0.11, q: 0.7, color: C.red, amp: 0.7, knots: 0.2 })] },
    { lens: L(1.05, 0.08, 0.9), defl: defl({ phi: 0.9, q: 0.9, re: 0.36, color: '#ffdcb0' }), sn: { x: 0.05, y: 0.03 }, src: [gal(L(1.05, 0.08, 0.9), 0.12, -0.03, { re: 0.12, q: 0.65, phi: 0.5, amp: 0.75, color: '#a9bfff', knots: 0.6, bulge: 0.15 })] },
    { lens: L(0.8, 0.05, 0.3), defl: defl({ re: 0.3, q: 0.8 }), src: [gal(L(0.8, 0.05, 0.3), 0.3, 0.02, { re: 0.1, phi: 1.4 })] },
    { lens: L(1.0, 0.13, 1.7), defl: defl({ q: 0.6, phi: 1.7 }), qso: { x: 0.14, y: 0.06 } },
    { lens: L(1.15, 0.05, 2.0), defl: defl({ re: 0.45, phi: 2.0 }), src: [gal(L(1.15, 0.05, 2.0), 0.06, -0.3, { re: 0.12, phi: 0.6, knots: 0.35 })] },
    { lens: L(0.9, 0.06, 1.0), defl: defl({ q: 0.8 }), src: [gal(L(0.9, 0.06, 1.0), 0.26, 0.2, { re: 0.08, q: 0.8, knots: 0.2 })] },
    { lens: L(1.3, 0.03, 0.6), defl: defl({ re: 0.55, q: 0.85, amp: 0.36 }), src: [gal(L(1.3, 0.03, 0.6), -0.4, -0.06, { re: 0.14, q: 0.45, phi: 0.2 })] },
    { lens: L(0.95, 0.05, 2.8), defl: defl({ phi: 2.8 }), src: [gal(L(0.95, 0.05, 2.8), 0.3, 0.0, { re: 0.1, phi: 2.6, knots: 0.25 })] },
  ];
  SPEC.forEach(t => { if (t.qso) t.pts = points(t.lens, t.qso); if (t.sn) t.pts = points(t.lens, t.sn); });
  const SN = SPEC.findIndex(t => t.sn), DAYS = 34 / Math.max(...SPEC[SN].pts.map(p => p.delay)); // longest delay ≈ 34 days
  const COLS = [0, SN, 2, 3], COLS_NARROW = [0, SN]; // which lenses form the grid's columns

  function scn(t, size, pts, ob = OBS[0]) { // a realsky scene for lens t as observatory `ob` images it, drawn at `size` px
    const recol = src => ({ ...src, color: mix(src.color, ...ob.tint) });
    return { cx: size / 2, cy: size / 2, scale: size * 0.24, psf: ob.psf * size * 0.24, defl: { ...t.defl, color: mix(t.defl.color || C.lrg, ...ob.tint) },
      sources: (t.src || (t.qso ? [gal(t.lens, t.qso.x, t.qso.y, { re: 0.1, q: 0.8, amp: 0.2, color: C.host, knots: 0.4, bulge: 0.5 })] : [])).map(recol),
      points: pts, pointColor: t.sn ? C.sn : C.qso };
  }
  const BAKED = {};
  // quasar variability: the same smooth wiggle in every image, shifted by that image's delay
  const qsoFlux = (t, d) => 1 + 0.3 * Math.sin(0.9 * (t - 3 * d)) + 0.12 * Math.sin(2.3 * (t - 3 * d) + 1);
  // supernova light curve (days since explosion): fast rise, slower decline; 0 before
  const snFlux = d => d <= 0 ? 0 : (1 - Math.exp(-d / 6)) * Math.exp(-d / 28) / 0.6;
  const snDay = t => (t * 12) % 120 - 8; // 12 days per second, looping
  function tileImage(i, row, t, size) {
    const T = SPEC[i], ob = OBS[row];
    if (T.qso) return RS.render(size, size, scn(T, size, T.pts.map(p => ({ x: p.x, y: p.y, amp: 18 * Math.sqrt(Math.abs(p.mu)) * qsoFlux(t, p.delay) })), ob));
    if (T.sn) { const day = snDay(t); return RS.render(size, size, scn(T, size, T.pts.map(p => ({ x: p.x, y: p.y, amp: 16 * Math.sqrt(Math.abs(p.mu)) * snFlux(day - p.delay * DAYS) })), ob)); }
    return BAKED[i + '/' + row] || (BAKED[i + '/' + row] = RS.bake(160, 160, scn(T, 160, [], ob)));
  }
  function frame(sk, x, y, w, a) {
    const P = [[x, y], [x + w, y], [x + w, y + w], [x, y + w]];
    P.forEach((c, j) => { const d = P[(j + 1) % 4]; sk.stroke2([c, [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2], d], { alpha: 0.3 * a, rough: 0.4, width: 1, passes: 1 }); });
  }

  // M: mosaic progress (0..1, from the end of step 2); step 3 then turns it into the supernova view
  function mosaic(sk, p, t, box, M) {
    const ctx = sk.ctx, f10 = '11px "IBM Plex Sans"', narrow = box.w < 520, cols = (narrow ? COLS_NARROW : COLS).length, rows = OBS.length, n = cols * rows;
    const lens = narrow ? COLS_NARROW : COLS, gut = narrow ? 64 : 92; // row labels sit in a gutter on the left
    const top = 34, bottom = 40, gap = Math.max(8, box.w * 0.012), TD = ease(win(p, 3.0, 3.45));
    const s = Math.min((box.w - 40 - gut - (cols - 1) * gap) / cols, (box.h - top - bottom - (rows - 1) * gap) / rows);
    const gw = gut + cols * s + (cols - 1) * gap, gx = box.x + (box.w - gw) / 2 + gut, gy = box.y + top + (box.h - top - bottom - rows * s - (rows - 1) * gap) / 2;
    // the supernova view: big tile on top, light curves below
    const big = Math.min(box.w - 48, (box.h - 80) * 0.58), bx = box.x + (box.w - big) / 2, by = box.y + 36;
    const snSlot = (rows - 1) * cols + lens.indexOf(SN); // Roman's image of the supernova (it runs a time-domain survey) grows into the big view
    for (let i = 0; i < n; i++) {
      const col = i % cols, row = Math.floor(i / cols), idx = lens[col];
      const k = i === 0 ? ease(clamp((M - 0.25) / 0.35, 0, 1)) : ease(clamp((M - 0.6) / 0.32 - (i - 1) * 0.04, 0, 1));
      if (k <= 0) continue;
      let fx = gx + col * (s + gap), fy = gy + row * (s + gap), w = s, a = i === 0 ? clamp((M - 0.25) * 6, 0, 1) : k;
      if (i === 0 && k < 1) { const B = Math.min(box.w, box.h) * 0.9; fx = lerp(box.x + (box.w - B) / 2, fx, k); fy = lerp(box.y + (box.h - B) / 2, fy, k); w = lerp(B, s, k); }
      if (TD > 0) { if (i === snSlot) { fx = lerp(fx, bx, TD); fy = lerp(fy, by, TD); w = lerp(s, big, TD); } else a *= clamp(1 - TD * 2.2, 0, 1); } // the others are gone before the light curves arrive
      if (a < 0.01) continue;
      const img = tileImage(idx, row, SPEC[idx].sn ? t : t + col * 0.7, // the supernova shares the light curves' clock
        i === snSlot && TD > 0 ? Math.round(w) : 160);
      ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(img, fx, fy, w, w); ctx.restore();
      frame(sk, fx, fy, w, a);
      if (i === snSlot && TD > 0.95) snLabels(sk, SPEC[SN], fx, fy, w, t);
    }
    const la = clamp((M - 0.6) * 2.5, 0, 1) * clamp(1 - TD * 2.2, 0, 1);
    if (la > 0.02) {
      sk.reserve && sk.reserve({ x: gx, y: gy, w: cols * s + (cols - 1) * gap, h: rows * s + (rows - 1) * gap }, 'mosaic');
      OBS.forEach((ob, r) => {
        const y = gy + r * (s + gap) + s / 2;
        sk.text2(gx - 12, y - 3, ob.name, { alpha: 0.85 * la, align: 'right', font: f10 });
        sk.text2(gx - 12, y + 11, ob.sub, { alpha: 0.5 * la, align: 'right', font: f10 });
      });
      sk.text2(gx, gy - 12, narrow ? 'SAME LENSES, 3 OBSERVATORIES' : 'THE SAME LENSES · THREE OBSERVATORIES', { alpha: 0.7 * la, font: f10 });
      if (!narrow) sk.text2(gx + cols * s + (cols - 1) * gap, gy - 12, 'quasar and supernova vary', { alpha: 0.5 * la, align: 'right', font: f10 });
    }
    if (TD > 0.6) lightCurves(sk, SPEC[SN], t, { x: box.x + 24, y: by + big + 44, w: box.w - 48, h: Math.min(150, box.y + box.h - (by + big + 44) - 22) }, (TD - 0.6) / 0.4, bx, by, big);
  }
  function snLabels(sk, T, x, y, w, t) {
    const day = snDay(t), sc = w * 0.24;
    T.pts.forEach((p, i) => {
      const on = snFlux(day - p.delay * DAYS) > 0.15, qx = x + w / 2 + p.x * sc, qy = y + w / 2 + p.y * sc, dx = p.x > 0 ? 14 : -14;
      sk.text2(qx + dx, qy - 10, 'ABCD'[i], { alpha: on ? 0.95 : 0.45, color: AMBER, align: dx > 0 ? 'left' : 'right', font: '11px "IBM Plex Sans"' });
    });
  }
  function lightCurves(sk, T, t, R, a, bx, by, big) {
    if (R.h < 40) return;
    const f10 = '11px "IBM Plex Sans"', day = snDay(t), D0 = -8, D1 = 112, X = d => R.x + (d - D0) / (D1 - D0) * R.w;
    const fmax = Math.max(...T.pts.map(p => Math.sqrt(Math.abs(p.mu)))) * 1.05, Y = f => R.y + R.h - f / fmax * (R.h - 6);
    sk.ctx.font = f10; const room = big - sk.ctx.measureText('day 120').width - 12; // the longest title that fits beside the day counter
    const title = ['A LENSED SUPERNOVA · as Roman sees it', 'SUPERNOVA · Roman', 'SUPERNOVA'].find(s => sk.ctx.measureText(s).width <= room) || '';
    sk.text2(bx, by - 12, title, { alpha: 0.7 * a, font: f10 });
    sk.text2(bx + big, by - 12, `day ${Math.max(0, Math.round(day))}`, { alpha: 0.7 * a, align: 'right', font: f10 });
    sk.text2(R.x, R.y - 10, 'LIGHT CURVES · each image, delayed', { alpha: 0.7 * a, font: f10 });
    sk.stroke2([[R.x, R.y + R.h], [R.x + R.w, R.y + R.h]], { alpha: 0.4 * a, rough: 0.2, passes: 1 });
    T.pts.forEach((p, i) => {
      const m = Math.sqrt(Math.abs(p.mu)), pts = [];
      for (let d = D0; d <= Math.min(day, D1); d += 1.5) pts.push([X(d), Y(m * snFlux(d - p.delay * DAYS))]);
      if (pts.length > 1) sk.stroke2(pts, { color: AMBER, alpha: (0.45 + 0.55 * (i === 0)) * a, width: 1.4, rough: 0.2, passes: 1 });
      const pk = p.delay * DAYS + 6 * Math.log(1 + 28 / 6); // day of peak for this image
      if (day > pk && pk < D1 - 6) sk.text2(X(pk), Y(m * snFlux(pk - p.delay * DAYS)) - 7, 'ABCD'[i], { color: AMBER, alpha: 0.9 * a, align: 'center', font: f10 });
    });
    if (day > D0) sk.stroke2([[X(day), R.y], [X(day), R.y + R.h]], { alpha: 0.35 * a, rough: 0.1, passes: 1, dash: [2, 4] });
  }

  // camera keyframes; `fit` frames the whole cone from the side, `ax` is the fov that frames it looking down the axis,
  // `fz` the fov that frames the one lens the camera dives into
  function camera(p, fit, ax, fz) {
    return [
      [0.0, { tx: 13, ty: 0, tz: 0, yaw: 0.95, pitch: 0.3, dist: fit * 1.15, fov: 0.9 }],
      [0.9, { tx: 13, ty: 0, tz: 0, yaw: 0.7, pitch: 0.22, dist: fit * 1.1, fov: 0.9 }],
      [1.1, { tx: 13, ty: 0, tz: 0, yaw: 0.62, pitch: 0.2, dist: fit * 1.1, fov: 0.9 }],
      [1.75, { tx: 11.5, ty: 0, tz: 0, yaw: -Math.PI / 2, pitch: 0, dist: 12, fov: ax }],
      [2.0, { tx: 11.5, ty: 0, tz: 0, yaw: -Math.PI / 2, pitch: 0, dist: 12, fov: ax }],
      [2.45, { tx: ZOOM.d[0], ty: ZOOM.d[1], tz: ZOOM.d[2], yaw: -Math.PI / 2, pitch: 0, dist: ZOOM.d[0] + 0.5, fov: fz }],
    ];
  }
  window.SLS = { scene, mosaic, camera, XMAX, OPEN, ZOOM, win };
})();
