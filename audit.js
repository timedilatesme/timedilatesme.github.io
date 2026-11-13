// layout audit (dev only, not linked from any page). On an explainer page, in the console:
//   const s = document.createElement('script'); s.src = '../audit.js'; document.body.append(s);
//   await audit()      -> [] when nothing overlaps at any point of the scroll
// Checks, every 0.1 step: canvas labels against each other and against reserved regions (insets, maps),
// labels leaving the plate, the step panel against the plate and its caption, and panels off screen or under the nav.
window.audit = async (step = 0.1) => {
  const sec = document.querySelector('.stage'), id = sec.id, N = sec.querySelectorAll('.step').length;
  const sk = { tomo: window.tomoSk, micro: window.mSk, slsim: window.slSk }[id] || eval({ tomo: 'tomoSk', micro: 'mSk', slsim: 'slSk' }[id]);
  const draw = eval({ tomo: 'drawTomo', micro: 'drawMicro', slsim: 'drawSL' }[id]);
  document.querySelectorAll('*').forEach(e => e.style.transition = 'none');
  const out = [], hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const R = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  for (let p = 0.02; p < N; p += step) {
    scrollTo({ top: sec.offsetTop + (sec.offsetHeight - innerHeight) * (p / N), behavior: 'instant' });
    await new Promise(r => setTimeout(r, 60));
    for (let i = 0; i < 20; i++) draw(performance.now() + i * 16);
    sk.audit = []; draw(performance.now()); const B = sk.audit; sk.audit = null;
    const plate = R(sec.querySelector('.plate')), cap = R(sec.querySelector('.plate .cap'));
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; if (a.solid) continue;
      if (!a.obj && (a.x < plate.x - 1 || a.x + a.w > plate.x + plate.w + 1 || a.y < plate.y - 1 || a.y + a.h > plate.y + plate.h + 1)) out.push([+p.toFixed(2), 'outside plate', a.name]);
      for (let j = 0; j < B.length; j++) { const b = B[j]; if (j === i) continue; if (a.obj ? !b.solid : !(j > i || b.solid) || b.obj) continue; if (hit(a, b)) out.push([+p.toFixed(2), a.name, '×', b.name]); }
    }
    for (const b of [...sec.querySelectorAll('.step.on .panel')].map(R).filter(r => r.w)) {
      if (hit(b, plate)) out.push([+p.toFixed(2), 'panel overlaps plate']);
      if (hit(b, cap)) out.push([+p.toFixed(2), 'panel overlaps caption']);
      if (b.y < 60 || b.y + b.h > innerHeight) out.push([+p.toFixed(2), 'panel off screen or under nav']);
    }
    if (plate.y < 60) out.push([+p.toFixed(2), 'plate under nav']);
    if (cap.y + cap.h > innerHeight) out.push([+p.toFixed(2), 'caption off screen']);
  }
  const seen = new Set(); return out.filter(o => { const k = o.slice(1).join('|'); if (seen.has(k)) return false; seen.add(k); return true; }).map(o => o.join(' '));
};
