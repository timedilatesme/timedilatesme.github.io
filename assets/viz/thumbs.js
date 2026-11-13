// thumbs.js — live drawings for the research cards (and, larger, the magnetic-field figure on its page).
//   Thumbs.mount(box, kind, { labels })   box: a positioned element; the drawing fills it, redraws on resize,
//                                         and animates (where it does) only while on screen.
//   kind: 'tomography' | 'microlensing' | 'slsim' | 'magnetic-fields'
// Colours follow the site: blue the nearer source (or the smaller disk), red the farther (or larger), amber the highlight.
(function () {
  const BLUE = '#7fb2ff', RED = '#ff7b63', AMBER = '#f2b45a', INK = '#eceae4', DIM = 'rgba(236,234,228,.55)';
  const FONT = s => `${s}px "IBM Plex Sans", sans-serif`;
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function layer(box) {
    const c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; box.append(c); return c;
  }
  function fit(c) {
    const d = Math.min(devicePixelRatio || 1, 2), r = c.getBoundingClientRect(), ctx = c.getContext('2d');
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
    return { ctx, w: r.width, h: r.height };
  }
  // a soft glowing ellipse (galaxies, the quasar)
  function glow(ctx, x, y, rx, ry, rot, color, a = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, '#fff'); g.addColorStop(0.18, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function line(ctx, pts, color, { a = 1, w = 1, dash = [] } = {}) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash);
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
  }
  function text(ctx, s, x, y, { color = DIM, size = 11, align = 'left' } = {}) {
    ctx.font = FONT(size); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
  }

  // ---------- tomography: a pseudo double-source-plane lens (pseudo-DSPL). Two separate lenses whose deflectors are
  // near-identical, with sources at different redshifts, are read as one lens with two sources (cf. Fig. 1 of the paper). ----------
  function tomography(box) {
    const c = layer(box);
    function draw() {
      const { ctx, w, h } = fit(c), top = 12, rowH = (h - top * 2) / 3, f = Math.max(10, Math.min(12, w * 0.03));
      const xo = w * 0.1, xl = w * 0.4, x1 = w * 0.66, x2 = w * 0.9, s = Math.min(rowH, w / 5);
      const rows = [['Lens 1', [1]], ['Lens 2', [2]], ['Pseudo-DSPL', [1, 2]]], ys = rows.map((_, i) => top + rowH * (i + 0.5));
      rows.forEach(([name, srcs], i) => {
        const y = ys[i], pseudo = i === 2;
        text(ctx, name, 10, y - rowH * 0.36, { size: f, color: pseudo ? INK : DIM });
        for (const k of srcs) { // rays: observer → past the deflector → source; the farther source has the larger Einstein angle
          const a = s * (k === 1 ? 0.24 : 0.34), xs = k === 1 ? x1 : x2, col = k === 1 ? BLUE : RED;
          for (const sg of [-1, 1]) line(ctx, [[xo, y], [xl, y + sg * a], [xs, y]], col, { a: 0.75, w: 1.2, dash: pseudo && k === 2 ? [4, 4] : [] });
        }
        glow(ctx, xl, y, s * 0.2, s * 0.15, 0.3, '#ffd29a');                       // the deflector, the same in every row
        if (srcs.includes(1)) glow(ctx, x1, y, s * 0.12, s * 0.06, -0.5, BLUE);
        if (srcs.includes(2)) {
          glow(ctx, x2, y, s * 0.12, s * 0.06, 0.6, RED, pseudo ? 0.7 : 1);
          if (pseudo) { ctx.save(); ctx.strokeStyle = RED; ctx.globalAlpha = 0.8; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(x2, y, s * 0.17, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
        }
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(xo, y, 2.2, 0, Math.PI * 2); ctx.fill(); // observer
        if (i < 2) line(ctx, [[10, y + rowH * 0.5], [w - 10, y + rowH * 0.5]], 'rgba(236,234,228,.1)');
      });
      // the two deflectors are near-identical: an amber link between them, labelled on the row divider
      const yl = ys[0] + s * 0.17, yb = ys[1] - s * 0.17, ym = (ys[0] + ys[1]) / 2, label = 'near-identical deflectors';
      line(ctx, [[xl, yl], [xl, yb]], AMBER, { a: 0.9, w: 1.2, dash: [2, 3] });
      ctx.font = FONT(f); const tw = ctx.measureText(label).width;
      ctx.fillStyle = '#080807'; ctx.fillRect(xl + 6, ym - f * 0.75, tw + 8, f * 1.5);
      text(ctx, label, xl + 10, ym, { size: f, color: AMBER });
      text(ctx, 'z₁', x1, ys[2] + rowH * 0.36, { color: BLUE, size: f, align: 'center' });             // the two source redshifts
      ctx.font = FONT(f); const vw = ctx.measureText('z₂ (virtual)').width;                         // kept inside the card
      text(ctx, 'z₂ (virtual)', Math.min(x2, w - 8 - vw / 2), ys[2] + rowH * 0.36, { color: RED, size: f, align: 'center' });
    }
    return { draw };
  }

  // ---------- microlensing: a magnification map from stars in the lens galaxy, with a quasar disk moving across it ----------
  function microlensing(box) {
    if (!window.Microlens) return null;
    const HALF = 2.8, SIG_B = 0.05, SIG_R = 0.05 * Math.pow(8000 / 3500, 4 / 3), Y = 0.42, N = 240; // disk size ∝ λ^(4/3)
    const map = document.createElement('canvas'); map.setAttribute('aria-hidden', 'true');
    map.style.cssText = 'position:absolute;left:0;width:100%;aspect-ratio:1;display:block'; box.append(map);
    const over = layer(box);
    let ml = null, curve = [], t0 = null;
    try { ml = new Microlens(map, { half: HALF, kappa: 0.45, gamma: 0.3, rays: 4e6 }); } catch (e) { console.warn(e); return null; }
    const span = 2 * HALF * 0.86, X = i => -span / 2 + span * i / (N - 1);
    function shoot() {
      const r = box.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2), s = Math.round(r.width * d);
      map.style.top = ((r.height - r.width) / 2) + 'px';
      if (map.width !== s) { map.width = map.height = s; }
      ml.view(HALF, 0, 0); ml.shoot(0);
      curve = Array.from({ length: N }, (_, i) => ml.lightCurve([X(i), Y], SIG_B, SIG_R)); // the light curve along the track
      ml.show();
    }
    function draw(ms) {
      if (!curve.length) shoot();
      const { ctx, w, h } = fit(over), pxu = w / (2 * HALF), y0 = h / 2 - Y * pxu;
      if (t0 === null) t0 = ms || 0;
      const f = Site.reduced ? 0.5 : (((ms || 0) - t0) / 14000) % 1, i = Math.round(f * (N - 1)), x = w / 2 + X(i) * pxu;
      line(ctx, [[w / 2 - span / 2 * pxu, y0], [w / 2 + span / 2 * pxu, y0]], INK, { a: 0.3, dash: [2, 5] });
      for (const [r, col, a] of [[2 * SIG_R, RED, 0.9], [2 * SIG_B, BLUE, 1]]) {
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y0, r * pxu, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      // the light curve so far, in a band along the bottom: the small (blue) disk flickers more than the large (red) one
      const lh = h * 0.2, ly = h - lh - 6, mag = m => -2.5 * Math.log10(Math.max(m, 1e-3) / ml.muMean);
      ctx.fillStyle = 'rgba(8,8,7,.72)'; ctx.fillRect(0, ly - 6, w, lh + 12);
      for (const [k, col] of [[1, RED], [0, BLUE]]) {
        const pts = curve.slice(0, Site.reduced ? N : i + 1).map((m, j) => [w / 2 + X(j) * pxu, ly + lh / 2 + Math.max(-1, Math.min(1, mag(m[k]) * 0.3)) * lh / 2]);
        if (pts.length > 1) line(ctx, pts, col, { w: 1.4, a: 0.95 });
      }
    }
    return { draw, resize: () => { curve = []; }, animated: !Site.reduced };
  }

  // ---------- SLSim: a montage of systems from a population (ray-traced, realsky.js) ----------
  function slsim(box) {
    if (!window.RS || !window.LA) return null;
    const c = layer(box), C = RS.COL, L = (thetaE, gamma, gphi) => ({ thetaE, gamma, gphi });
    const defl = o => ({ re: 0.7, n: 4, q: 0.75, phi: 0.5, amp: 0.09, ...o });
    const disk = (lens, x, y, o) => ({ lens, x, y, re: 0.14, n: 1, q: 0.65, phi: 0.6, amp: 1.1, color: C.blue, knots: 0.6, bulge: 0.04, seed: 3, ...o });
    const host = (lens, x, y, o) => ({ lens, x, y, re: 0.14, n: 1, q: 0.8, phi: 1.2, amp: 0.2, color: C.host, knots: 0.4, bulge: 0.5, seed: 5, ...o });
    const pts = (lens, bx, by, k) => LA.pointImages({ ...lens, bx, by }).map(p => ({ x: p.x, y: p.y, amp: k * Math.sqrt(Math.abs(p.mu)) }));
    const POP = [ // galaxy-scale lenses of different galaxies, a lensed quasar with its host, a lensed supernova in its host's disk
      { l: L(1, 0.05, 0.4), d: defl({ phi: 0.4, q: 0.7 }), s: [disk(L(1, 0.05, 0.4), 0.12, 0.05, { seed: 2 })] },
      { l: L(0.9, 0.1, 0.9), d: defl({ phi: 0.9, q: 0.78, color: '#ffb877' }), s: [host(L(0.9, 0.1, 0.9), 0.03, -0.04)], p: [0.03, -0.04, 18, C.qso] },
      { l: L(1.1, 0.03, 2.2), d: defl({ phi: 2.2, q: 0.6, re: 0.8, color: '#ffd29a' }), s: [disk(L(1.1, 0.03, 2.2), 0.32, -0.12, { q: 0.55, phi: 0.2, seed: 6 })] },
      { l: L(1.05, 0.08, 0.9), d: defl({ phi: 0.9, q: 0.88, color: '#ffdcb0' }), s: [disk(L(1.05, 0.08, 0.9), 0.12, -0.03, { re: 0.16, amp: 0.75, bulge: 0.15, seed: 9 })], p: [0.05, 0.03, 20, C.sn] },
      { l: L(1.05, 0.06, 1.7), d: defl({ phi: 1.7, q: 0.66 }), s: [disk(L(1.05, 0.06, 1.7), -0.18, 0.2, { q: 0.75, phi: 1.1, color: '#b7c9ff', seed: 4 })] },
      { l: L(0.85, 0.04, 0.2), d: defl({ phi: 0.2, q: 0.9, re: 0.6, color: '#ffc488' }), s: [disk(L(0.85, 0.04, 0.2), 0.02, -0.03, { re: 0.12, q: 0.8, seed: 7 })] },
    ];
    function draw() {
      const { ctx, w, h } = fit(c), cols = 3, rows = 2, g = 6, s = Math.min((w - g * (cols - 1)) / cols, (h - g * (rows - 1)) / rows);
      const x0 = (w - cols * s - (cols - 1) * g) / 2, y0 = (h - rows * s - (rows - 1) * g) / 2;
      POP.forEach((P, i) => {
        const x = x0 + (i % cols) * (s + g), y = y0 + Math.floor(i / cols) * (s + g);
        ctx.strokeStyle = 'rgba(237,233,223,.14)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
        RS.draw(ctx, x, y, s, s, { cx: s / 2, cy: s / 2, scale: s * 0.23, psf: 0.9, defl: P.d, sources: P.s,
          points: P.p ? pts(P.l, P.p[0], P.p[1], P.p[2]) : [], pointColor: P.p && P.p[3] });
      });
    }
    return { draw };
  }

  // ---------- magnetic fields: Faraday rotation of a background quasar's light by a foreground galaxy's halo ----------
  function magneticFields(box, { labels = false } = {}) {
    const c = layer(box);
    function draw(ms) {
      const { ctx, w, h } = fit(c), u = Math.min(w, h * 1.4);
      const gx = w * 0.5, gy = h * (labels ? 0.58 : 0.62), Rh = labels ? Math.min(h * 0.3, w * 0.19) : u * 0.26, D = Rh * 0.52, yr = gy - D; // halo radius, impact parameter
      const xq = w * 0.9, xo = w * 0.08, chord = Math.sqrt(Rh * Rh - D * D);
      // the halo and its magnetic field (loops around the disk, with arrows)
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(236,234,228,.35)'; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(gx, gy, Rh, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      [[0.5, 0.2], [0.75, 0.38], [0.95, 0.58]].forEach(([fx, fy], k) => {
        ctx.save(); ctx.strokeStyle = INK; ctx.globalAlpha = 0.32 - k * 0.06; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(gx, gy, Rh * fx, Rh * fy, 0, 0, Math.PI * 2); ctx.stroke();
        for (const sg of [-1, 1]) { // arrowheads at the loop's two ends: the field circulates around the disk
          const ax = gx + sg * Rh * fx, ay = gy, dy = sg > 0 ? -1 : 1;
          ctx.beginPath(); ctx.moveTo(ax - 3.5, ay - dy * 4); ctx.lineTo(ax, ay + dy * 2); ctx.lineTo(ax + 3.5, ay - dy * 4); ctx.stroke();
        }
        ctx.restore();
      });
      // the foreground galaxy, edge-on
      glow(ctx, gx, gy, Rh * 0.62, Rh * 0.09, 0, '#ffd29a'); glow(ctx, gx, gy, Rh * 0.16, Rh * 0.12, 0, '#ffe2b8');
      // the sightline from the quasar to us, and the quasar
      line(ctx, [[xq, yr], [xo + 8, yr]], INK, { a: 0.55, w: 1.1 });
      line(ctx, [[xo + 15, yr - 4], [xo + 8, yr], [xo + 15, yr + 4]], INK, { a: 0.55, w: 1.1 });
      glow(ctx, xq, yr, u * 0.035, u * 0.035, 0, '#dfe8ff');
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(xo, yr, 2.4, 0, Math.PI * 2); ctx.fill();
      // polarization angle along the way: steady, turning inside the halo (Faraday rotation), steady again
      const turn = x => 1.25 - 1.1 * sstep(gx + chord, gx - chord, x), step = Math.max(14, u * 0.045), L = Math.max(5, u * 0.016);
      const head = Site.reduced || !labels ? null : xq - ((((ms || 0) / 1000) * u * 0.28) % (xq - xo));
      for (let x = xq - step; x > xo + 14; x -= step) {
        const a = turn(x), near = head === null ? 1 : 0.45 + 0.55 * Math.exp(-(((x - head) / (u * 0.12)) ** 2));
        line(ctx, [[x - Math.cos(a) * L, yr - Math.sin(a) * L], [x + Math.cos(a) * L, yr + Math.sin(a) * L]], AMBER, { a: near, w: 1.6 });
      }
      // the impact parameter
      line(ctx, [[gx, gy - Rh * 0.14], [gx, yr + 3]], INK, { a: 0.6, dash: [2, 3] });
      text(ctx, 'D', gx + 6, (gy + yr) / 2, { color: INK, size: labels ? 13 : 11 });
      if (!labels) return;
      // labels, each in its own clear space: above the halo, beside it, and at the two ends of the sightline
      const s = Math.max(10.5, Math.min(13.5, w * 0.018)), lh = s * 1.35, gap = 10;
      const lines = (arr, x, y, o) => arr.forEach((t, i) => text(ctx, t, x, y + (i - (arr.length - 1) / 2) * lh, { size: s, ...o }));
      lines(['polarization angle turns', 'inside the halo (Faraday rotation)'], gx, gy - Rh - lh * 1.4, { align: 'center', color: AMBER });
      lines(['polarized', 'radio light'], (gx + Rh + xq) / 2, yr - lh * 1.5, { align: 'center' });
      lines(['background', 'quasar'], Math.min(xq, w - 8 - ctx.measureText('background').width / 2), yr + lh * 1.7, { align: 'center' });
      text(ctx, 'us', xo, yr + lh * 1.2, { size: s, align: 'center' });
      lines(['foreground galaxy', '(Mg II absorber)'], gx - Rh - gap, gy + lh * 0.6, { align: 'right' });
      lines(['magnetic field', 'in the halo'], gx + Rh + gap, gy + Rh * 0.45, { align: 'left' });
      if (w > 520) text(ctx, 'impact parameter', gx + 20, (gy + yr) / 2, { size: s }); // on a phone, the caption explains D
    }
    return { draw, animated: labels && !Site.reduced };
  }

  const KINDS = { tomography, microlensing, slsim, 'magnetic-fields': magneticFields };
  function mount(box, kind, o = {}) {
    const fig = KINDS[kind] && KINDS[kind](box, o); if (!fig) return;
    const visible = () => { const r = box.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };
    const redraw = () => { try { fig.draw(performance.now()); } catch (e) { console.warn(e); } };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(redraw);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (fig.resize) fig.resize(); redraw(); }, 200); });
    if (fig.animated && window.Site) Site.loop(ms => { if (visible()) fig.draw(ms); });
  }
  window.Thumbs = { mount };
})();
