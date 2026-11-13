// tomo.js — strong lensing tomography, drawn with sketch3d.
// World: line of sight along +x. Thin-lens geometry: each ray is straight, kinked once at the lens plane.
// Steps (p in [0,4)):
//   0  single source plane: one ring, θE ∝ D_ds/D_s
//   1  second, farther source: larger ring. Ratio of radii -> distance ratio -> w   (a DSPL)
//   2  DSPLs are rare: surveys instead find many *separate* lenses (split)
//   3  pair lenses with self-similar deflectors -> treat as a pseudo-DSPL (merge, virtual source)
(function () {
  const { G, add, clamp, lerp, ease, TAU } = S3;
  const BLUE = '#7fb2ff', RED = '#ff7b63', INK = '#ece6d6', AMBER = '#f2b45a';
  const OBS = [-9, 0, 0], XD = -2, XS1 = 3.5, XS2 = 9, R1 = 1.0, R2 = 1.45;
  const win = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

  let SPR = null;
  // galaxies use the same light model as the lensed images (realsky.js), unlensed: the nearer source has a blue disk, the farther a red one
  const sprites = () => SPR || (SPR = { ell: RS.galaxy(128, 'elliptical', { q: 0.72, re: 0.2, amp: 0.6 }), sp1: RS.galaxy(160, 'spiral', { color: RS.COL.blue, seed: 3, bulge: 0.2 }), sp2: RS.galaxy(160, 'spiral', { color: RS.COL.red, bcolor: '#ffd0b0', arms: 3, pitch: 0.45, seed: 6, bulge: 0.2 }) });
  // insets use realistic light (realsky.js); the nearer source is blue, the farther red, as everywhere on the site
  const LENS = { thetaE: 1, gamma: 0.05, gphi: 0.5 };
  const SRC1 = { lens: LENS, x: 0.16, y: 0.06, re: 0.14, n: 1, q: 0.6, phi: 0.6, amp: 1.2, color: RS.COL.blue, knots: 0.6, bulge: 0.04, seed: 2 };
  const SRC2 = { lens: { ...LENS, thetaE: 1.45 }, x: -0.2, y: 0.08, re: 0.15, n: 1, q: 0.65, phi: 2.1, amp: 0.9, color: RS.COL.red, knots: 0.6, bulge: 0.04, seed: 8 };
  const DEFL = { re: 0.7, n: 4, q: 0.72, phi: 0.5, amp: 0.09 }; // extended, as real lens galaxies are
  const insetCache = {};
  function insetImage(s, which) {
    const key = which.join() + '/' + Math.round(s);
    return insetCache[key] || (insetCache[key] = RS.bake(s, s, { cx: s / 2, cy: s / 2, scale: s * 0.24, psf: 0, sources: which.map(w => w === 1 ? SRC1 : SRC2), defl: DEFL }));
  }

  function deflector(sk, c, a, dashed) { LG.blit3d(sk, sprites().ell, c, 1.25, { alpha: (dashed ? 0.45 : 1) * a }); }
  function diskNormal(t) { // spiral3d disks lie in the local x–z plane, rotated by [1.15, t·0.05, 0.25]
    const r = (p, rx, ry, rz) => { let [x, y, z] = p, c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c]; c = Math.cos(ry); s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c]; c = Math.cos(rz); s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c]; return [x, y, z]; };
    return r([0, 1, 0], 1.15, t * 0.05, 0.25);
  }
  function source(sk, c, col, a, t, dashed, which) {
    LG.blit3d(sk, which === 2 ? sprites().sp2 : sprites().sp1, c, 1.15, { normal: diskNormal(t), spin: t * 0.05, alpha: (dashed ? 0.5 : 1) * a });
  }
  function rays(sk, src, lens, R, col, a, draw, dashed) {
    for (let i = 0; i < 6; i++) {
      const ang = 0.35 + i * TAU / 6, k = add(lens, [0, Math.cos(ang) * R, Math.sin(ang) * R]);
      sk.stroke([...G.line(src, k, 16), ...G.line(k, OBS, 24).slice(1)], { color: col, alpha: 0.55 * a, width: 0.9, rough: 0.9, draw, dash: dashed ? [4, 5] : null });
    }
  }
  function ring(sk, c, R, col, a, draw) { sk.stroke(G.ring(c, R, { rz: Math.PI / 2, n: 96 }), { color: col, alpha: a, width: 1.8, passes: 3, draw }); }
  function bracket(sk, x0, x1, y, col, text, a) {
    if (a <= 0.01) return;
    sk.stroke(G.line([x0, y, 0], [x1, y, 0], 20), { color: col, alpha: 0.8 * a, width: 1, rough: 0.6 });
    for (const x of [x0, x1]) sk.stroke(G.line([x, y - 0.15, 0], [x, y + 0.15, 0], 2), { color: col, alpha: 0.8 * a, rough: 0.4, passes: 1 });
    const q = sk.project([(x0 + x1) / 2, y, 0]); if (!q) return;
    const [main, sub] = text.split('_'); // D_ds -> D with subscript ds
    sk.text2(q[0] - 4, q[1] - 6, main, { color: col, alpha: a, align: 'right', font: 'italic 14px "IBM Plex Sans", sans-serif' });
    sk.text2(q[0] - 3, q[1] - 2, sub, { color: col, alpha: a, align: 'left', font: 'italic 10px "IBM Plex Sans", sans-serif' });
  }
  // "What the telescope sees" inset(s), screen space: a ray-traced image of the lens
  function inset(sk, x, y, s, which, a, title) {
    for (const [p0, p1] of [[[x, y], [x + s, y]], [[x + s, y], [x + s, y + s]], [[x + s, y + s], [x, y + s]], [[x, y + s], [x, y]]])
      sk.stroke2([p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], p1], { alpha: 0.45 * a, width: 1, rough: 0.8 });
    sk.text2(x + 6, y - 6, title, { alpha: 0.7 * a, font: '11px "IBM Plex Sans", sans-serif' });
    sk.reserve && sk.reserve({ x, y, w: s, h: s }, 'inset');
    const ctx = sk.ctx; ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(insetImage(s, which), x, y, s, s); ctx.restore();
  }

  function draw(sk, p, t, box) {
    const e1 = ease(win(p, 0.05, 0.6)), e2 = ease(win(p, 0.95, 1.5));
    const split = ease(win(p, 1.9, 2.5)) * (1 - ease(win(p, 2.85, 3.5)));
    const virt = win(p, 2.85, 3.2) > 0.5;
    const off = 2.4 * split, D1 = [XD, off, 0], D2 = [XD + 0.6 * split, -off, 0];
    const S1 = [XS1, off, 0], S2 = [XS2, -off, 0];
    const lensForS2 = virt || split > 0.02 ? D2 : D1;

    const qo = sk.project(OBS), oa = qo ? clamp((qo[2] - 11) / 4, 0, 1) : 0; // fade out when the camera is right behind it
    if (oa > 0) { sk.strokes(G.sphere(OBS, 0.35, { lat: 3, lon: 4 }), { alpha: 0.7 * oa }); sk.label(OBS, 'observer', { dx: -24, dy: 30, alpha: 0.7 * oa }); }
    deflector(sk, D1, 1);
    if (split > 0.02 || virt) deflector(sk, D2, 1, virt && split < 0.05);
    source(sk, S1, BLUE, e1, t);
    rays(sk, S1, D1, R1, BLUE, 1, e1);
    ring(sk, D1, R1, BLUE, 1, e1);
    if (e2 > 0) {
      source(sk, S2, RED, e2, t, virt && split < 0.05, 2);
      rays(sk, S2, lensForS2, R2, RED, 0.9, e2, virt && split < 0.05);
      ring(sk, lensForS2, R2, RED, 0.9, e2);
    }
    // labels
    const lab = 1 - split;
    if (lab > 0.5) {
      sk.label(D1, virt ? 'deflector A ≈ twin B' : 'deflector', virt ? { dx: 70, dy: 110, alpha: 0.75 } : { dx: 30, dy: box.compact ? 44 : -44, alpha: 0.75 }); // above the distance brackets (phones have none) // from behind the observer, clear of the rings
      if (split < 0.03 && !virt) { // source labels only while the sources sit still, and not from behind the observer (they'd sit on the rings)
        if (e1 > .9) sk.label(S1, 'source · z₁', { dx: 22, dy: 34, color: BLUE }); // below, so it never meets z₂'s label above
        if (e2 > .9) sk.label(S2, virt ? 'virtual source · z₂' : 'source · z₂', { dx: -22, dy: -34, color: RED });
      }
    } else {
      sk.label(D1, 'lens A', { dx: 26, dy: -36, alpha: 0.8 }); sk.label(D2, 'lens B', { dx: 26, dy: 36, alpha: 0.8 });
    }
    // distance brackets (only while the geometry is a single line of sight)
    const ba = box.compact ? 0 : clamp(1 - split * 3, 0, 1) * win(p, 0.6, 1.0) * (1 - win(p, 1.65, 1.82)); // brackets only for steps 1–2; skip on phones
    bracket(sk, OBS[0], XD, -2.4, INK, 'D_d', ba * (1 - e2 * 0.4));
    bracket(sk, XD, XS1, -2.4, BLUE, 'D_ds1', ba);
    bracket(sk, OBS[0], XS1, -3.4, BLUE, 'D_s1', ba);
    bracket(sk, XD, XS2, -4.4, RED, 'D_ds2', ba * e2);
    bracket(sk, OBS[0], XS2, -5.4, RED, 'D_s2', ba * e2);
    // insets
    const s = Math.min(170, box.w * 0.24, box.h * 0.32), x = box.x + box.w - s - 18, y = box.y + box.h - s - 30;
    if (split < 0.5) inset(sk, x, y, s, e2 > 0.5 ? [1, 2] : [1], e1, virt ? (box.w < 640 ? 'A + B' : 'PSEUDO-DSPL (A+B)') : 'ON THE SKY');
    else { inset(sk, x - s - 24, y, s, [1], 1, 'LENS A'); inset(sk, x, y, s, [2], 1, 'LENS B'); }
  }
  window.Tomo = { draw, BLUE, RED, AMBER };
})();
