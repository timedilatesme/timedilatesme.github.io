// stage.js — helpers shared by the research explainer pages: a pinned, scroll-driven "stage" whose
// figure sits in a plate beside (or, on phones, above) a column of step panels.
(function () {
  const { clamp, lerp } = S3;
  const smooth = t => t * t * (3 - 2 * t);
  const inView = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  // interpolate camera keyframes [[p, {..}], ...] at progress p
  function keyframes(p, K) {
    if (p <= K[0][0]) return { ...K[0][1] };
    for (let i = 1; i < K.length; i++) if (p <= K[i][0]) {
      const t = smooth((p - K[i - 1][0]) / (K[i][0] - K[i - 1][0])), a = K[i - 1][1], b = K[i][1], o = {};
      for (const k in a) o[k] = lerp(a[k], b[k], t); return o;
    }
    return { ...K[K.length - 1][1] };
  }
  function clipTo(ctx, r) { ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); }
  function place(el, r) { Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); return r; }
  const focal = sk => (sk.h / 2) / Math.tan(sk.cam.fov / 2);
  // a pinned stage: returns a function giving progress p in [0, nSteps), and shows the matching step panel
  function stage(sec) {
    const steps = [...sec.querySelectorAll('.step')], dots = [...sec.querySelectorAll('.dots i')], n = steps.length;
    return () => {
      const r = sec.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight), 0, 0.999) * n, i = Math.floor(p);
      steps.forEach((s, k) => { const on = k === i && r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5; s.classList.toggle('on', on); s.setAttribute('aria-hidden', !on); });
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      return p;
    };
  }
  // the region a stage's figure owns: right of the text column, or above the text on phones (below the nav)
  function stageRect() {
    const W = innerWidth, H = innerHeight, nav = 60;
    if (W < 820) return { x: W * 0.04, y: nav + 14, w: W * 0.92, h: (H - nav) * 0.42 };
    const x = Math.max(W * 0.06 + Math.min(400, W * 0.33) + 48, W * 0.42);
    return { x, y: nav + (H - nav) * 0.09, w: W * 0.95 - x, h: (H - nav) * 0.76 };
  }
  // centre a sketch camera's view on a plate
  function aim(sk, box) { sk.cam.ox = (box.x + box.w / 2) / sk.w - 0.5; sk.cam.oy = (box.y + box.h / 2) / sk.h - 0.5; }
  window.Stage = { keyframes, clipTo, place, focal, stage, stageRect, aim, inView, smooth };
})();
