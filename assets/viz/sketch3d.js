// sketch3d.js — a tiny "hand-drawn 3D" renderer on Canvas2D.
// 3D points -> perspective projection -> jittered double strokes that "boil"
// (re-seed a few times a second), like a pencil animation. No dependencies.
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }
  function rot([x, y, z], rx = 0, ry = 0, rz = 0) {
    let c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c];
    c = Math.cos(ry); s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c];
    c = Math.cos(rz); s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c];
    return [x, y, z];
  }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const rot3 = (p, r, k) => rot([p[0] * k, p[1] * k, p[2] * k], r[0], r[1], r[2]);

  // ---- geometry helpers: all return arrays of 3D points ----
  const G = {
    ring(c, r, { rx = 0, ry = 0, rz = 0, n = 72, a0 = 0, a1 = TAU, rr = r } = {}) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n;
        pts.push(add(c, rot([Math.cos(a) * r, 0, Math.sin(a) * rr], rx, ry, rz)));
      }
      return pts;
    },
    line(a, b, n = 14) {
      const pts = [];
      for (let i = 0; i <= n; i++) { const t = i / n; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
      return pts;
    },
    bezier(a, b, c, n = 40) { // quadratic
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        pts.push([0, 1, 2].map(k => u * u * a[k] + 2 * u * t * b[k] + t * t * c[k]));
      }
      return pts;
    },
    sphere(c, r, { lat = 5, lon = 8, rx = 0, ry = 0, rz = 0 } = {}) {
      const strokes = [];
      for (let i = 1; i < lat; i++) {
        const phi = -Math.PI / 2 + Math.PI * i / lat;
        strokes.push(G.ring([0, Math.sin(phi) * r, 0], Math.cos(phi) * r).map(p => add(c, rot(p, rx, ry, rz))));
      }
      for (let j = 0; j < lon; j++) {
        strokes.push(G.ring([0, 0, 0], r, { rx: Math.PI / 2, ry: Math.PI * j / lon }).map(p => add(c, rot(p, rx, ry, rz))));
      }
      return strokes;
    },
    spiral(c, { arms = 2, turns = 1.3, r0 = 0.15, r1 = 1, n = 60, rx = 0, ry = 0, rz = 0 } = {}) {
      const strokes = [];
      for (let k = 0; k < arms; k++) {
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const t = i / n, a = k * TAU / arms + t * turns * TAU, r = r0 + (r1 - r0) * t;
          pts.push(add(c, rot([Math.cos(a) * r, 0, Math.sin(a) * r], rx, ry, rz)));
        }
        strokes.push(pts);
      }
      return strokes;
    },
    grid(c, size, { div = 6, rx = 0, ry = 0, rz = 0 } = {}) {
      const s = [], h = size / 2;
      for (let i = 0; i <= div; i++) {
        const u = -h + size * i / div;
        s.push(G.line([u, -h, 0], [u, h, 0]).map(p => add(c, rot(p, rx, ry, rz))));
        s.push(G.line([-h, u, 0], [h, u, 0]).map(p => add(c, rot(p, rx, ry, rz))));
      }
      return s;
    },
  };

  class Sketch {
    constructor(canvas, opts = {}) {
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.ink = opts.ink || '#ece6d6';
      this.boilMs = opts.boil ?? 120;
      this.cam = { yaw: 0, pitch: 0, roll: 0, dist: 12, fov: 0.9, tx: 0, ty: 0, tz: 0, ox: 0, oy: 0 };
      this.seed = 7; this.lastBoil = 0; this.k = 0;
      this.resize();
      addEventListener('resize', () => this.resize());
    }
    resize() {
      const d = Math.min(devicePixelRatio || 1, 2), r = this.c.getBoundingClientRect();
      this.c.width = r.width * d; this.c.height = r.height * d;
      this.w = r.width; this.h = r.height; this.ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    begin(t) {
      if (t - this.lastBoil > this.boilMs) { this.seed = (this.seed * 16807) % 2147483647; this.lastBoil = t; }
      this.ctx.clearRect(0, 0, this.w, this.h); this.k = 0;
    }
    project(p) {
      const c = this.cam;
      let [x, y, z] = [p[0] - c.tx, p[1] - c.ty, p[2] - c.tz];
      [x, y, z] = rot([x, y, z], 0, -c.yaw, 0);
      [x, y, z] = rot([x, y, z], -c.pitch, 0, 0);
      [x, y, z] = rot([x, y, z], 0, 0, c.roll);
      const zc = c.dist - z; if (zc < 0.2) return null;
      const f = (this.h / 2) / Math.tan(c.fov / 2);
      return [this.w / 2 + c.ox * this.w + x * f / zc, this.h / 2 + c.oy * this.h - y * f / zc, zc];
    }
    // Draw a 3D polyline as a rough pencil stroke.
    // opts: rough (px jitter), passes, width, alpha, draw (0..1 draw-on), color, fog
    stroke(pts, o = {}) {
      const { rough = 1.4, passes = 2, width = 1.1, alpha = 0.9, draw = 1, color = this.ink, fog = 40, dash } = o;
      this.k++;
      if (draw <= 0) return;
      const n = Math.max(2, Math.floor(pts.length * clamp(draw, 0, 1)));
      const P = []; let zsum = 0, cnt = 0;
      for (let i = 0; i < n; i++) { const q = this.project(pts[i]); P.push(q); if (q) { zsum += q[2]; cnt++; } }
      if (!cnt) return;
      const depthA = clamp(1.25 - (zsum / cnt) / fog, 0.12, 1);
      const ctx = this.ctx;
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash(dash || []);
      for (let pass = 0; pass < passes; pass++) {
        const r = rng(this.seed + this.k * 7919 + pass * 104729);
        const off = [(r() - .5) * rough * 1.5, (r() - .5) * rough * 1.5];
        ctx.globalAlpha = alpha * depthA * (pass ? 0.55 : 1);
        ctx.beginPath(); let started = false, prev = null;
        for (let i = 0; i < P.length; i++) {
          const q = P[i]; if (!q) { started = false; continue; }
          const x = q[0] + off[0] + (r() - .5) * rough, y = q[1] + off[1] + (r() - .5) * rough;
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + x) / 2, (prev[1] + y) / 2);
          prev = [x, y];
        }
        if (prev) ctx.lineTo(prev[0], prev[1]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.setLineDash([]);
    }
    strokes(list, o) { for (const s of list) this.stroke(s, o); }
    // Stippled point cloud (galaxies). pts: [x, y, z, w] in local coords; rot = [rx, ry, rz]; placed at c.
    stipple(pts, c, { color = this.ink, alpha = 1, size = 1.2, scale = 1, rot = [0, 0, 0], jitter = 0 } = {}) {
      const ctx = this.ctx, sd = this.seed; ctx.fillStyle = color;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = this.project(add(c, rot3(p, rot, scale))); if (!q) continue;
        const h = ((i * 2654435761 + sd * 40503) >>> 0) / 4294967296, h2 = ((i * 40503 + sd * 2654435761) >>> 0) / 4294967296;
        ctx.globalAlpha = alpha * p[3] * clamp(1.25 - q[2] / 40, 0.15, 1);
        ctx.fillRect(q[0] + (h - .5) * jitter * 2, q[1] + (h2 - .5) * jitter * 2, size, size);
      }
      ctx.globalAlpha = 1;
    }
    // Same pencil stroke, but for points already in screen space ([x,y] px)
    stroke2(pts, o = {}) {
      const { rough = 1.2, passes = 2, width = 1.1, alpha = 0.9, draw = 1, color = this.ink, dash } = o;
      this.k++;
      if (draw <= 0 || pts.length < 2) return;
      const n = Math.max(2, Math.floor(pts.length * clamp(draw, 0, 1))), ctx = this.ctx;
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(dash || []);
      for (let pass = 0; pass < passes; pass++) {
        const r = rng(this.seed + this.k * 7919 + pass * 104729), off = [(r() - .5) * rough * 1.5, (r() - .5) * rough * 1.5];
        ctx.globalAlpha = alpha * (pass ? 0.55 : 1); ctx.beginPath(); let prev = null;
        for (let i = 0; i < n; i++) {
          const x = pts[i][0] + off[0] + (r() - .5) * rough, y = pts[i][1] + off[1] + (r() - .5) * rough;
          if (!prev) ctx.moveTo(x, y); else ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + x) / 2, (prev[1] + y) / 2);
          prev = [x, y];
        }
        ctx.lineTo(prev[0], prev[1]); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.setLineDash([]);
    }
    circle2(cx, cy, r, o = {}) { // screen-space sketchy circle/ellipse/arc
      const { n = 64, a0 = 0, a1 = TAU, ry = r, rot: th = 0 } = o, pts = [], c = Math.cos(th), s = Math.sin(th);
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * r, y = Math.sin(a) * ry; pts.push([cx + x * c - y * s, cy + x * s + y * c]); }
      this.stroke2(pts, o);
    }
    text2(x, y, text, o = {}) {
      const ctx = this.ctx; ctx.globalAlpha = o.alpha ?? 0.85; ctx.fillStyle = o.color || this.ink;
      ctx.font = o.font || '12px "IBM Plex Sans", sans-serif'; ctx.textAlign = o.align || 'left';
      if (o.inside && this.bounds) { // o.inside: skip text anchored in the scene when it would leave the plate
        const w = ctx.measureText(text).width, al = o.align || 'left', x0 = al === 'right' ? x - w : al === 'center' ? x - w / 2 : x, B = this.bounds;
        if (x0 < B.x + 4 || x0 + w > B.x + B.w - 4 || y - 10 < B.y + 4 || y + 3 > B.y + B.h - 4) { ctx.globalAlpha = 1; return; }
      }
      ctx.fillText(text, x, y); ctx.globalAlpha = 1;
      if (this.audit && text && (o.alpha ?? 0.85) > 0.05) { // layout audit: record the text's box
        const w = ctx.measureText(text).width, fs = +(ctx.font.match(/(\d+(?:\.\d+)?)px/) || [0, 12])[1], al = o.align || 'left';
        this.audit.push({ x: al === 'right' ? x - w : al === 'center' ? x - w / 2 : x, y: y - fs * 0.8, w, h: fs, name: text });
      }
    }
    // layout audit: a screen region that text must not cover (insets, maps, mosaics)
    reserve(r, name) { if (this.audit) this.audit.push({ ...r, name, solid: true }); }
    // A small scribbled dot (stars, images)
    dot(p, r = 1.5, o = {}) {
      const q = this.project(p); this.k++; if (!q) return;
      const rr = rng(this.seed + this.k * 31), ctx = this.ctx, s = r * 6 / Math.sqrt(q[2]);
      ctx.globalAlpha = (o.alpha ?? 0.8); ctx.strokeStyle = o.color || this.ink; ctx.lineWidth = o.width || 1;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = i / 8 * TAU + rr() * .4, k = s * (0.7 + rr() * .5);
        i ? ctx.lineTo(q[0] + Math.cos(a) * k, q[1] + Math.sin(a) * k) : ctx.moveTo(q[0] + Math.cos(a) * k, q[1] + Math.sin(a) * k);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // Handwritten-ish annotation with a leader line
    label(p, text, o = {}) {
      if (this.labelsOn === false) return;
      const q = this.project(p); if (!q) return;
      const { dx = 30, dy = -24, alpha = 0.85, font = '12px "IBM Plex Sans", sans-serif', color = this.ink } = o;
      const ctx = this.ctx;
      if (this.bounds) { // skip a label that would not fit inside the figure's plate
        ctx.font = font; const w = ctx.measureText(text).width, tx = q[0] + dx * .8 + (dx > 0 ? 18 : -18), x0 = dx > 0 ? tx : tx - w, B = this.bounds, ty = q[1] + dy * .8;
        if (Math.min(q[0], x0) < B.x + 4 || Math.max(q[0], x0 + w) > B.x + B.w - 4 || Math.min(q[1], ty - 10) < B.y + 4 || Math.max(q[1], ty + 4) > B.y + B.h - 4) return;
      } ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + dx * .8, q[1] + dy * .8); ctx.lineTo(q[0] + dx * .8 + (dx > 0 ? 14 : -14), q[1] + dy * .8); ctx.stroke();
      ctx.font = font; ctx.textAlign = dx > 0 ? 'left' : 'right';
      const tx = q[0] + dx * .8 + (dx > 0 ? 18 : -18), ty = q[1] + dy * .8 + 4;
      ctx.fillText(text, tx, ty); ctx.globalAlpha = 1;
      if (this.audit && alpha > 0.05) { const w = ctx.measureText(text).width; this.audit.push({ x: dx > 0 ? tx : tx - w, y: ty - 10, w, h: 12, name: text }); }
    }
  }

  // Scroll progress helpers
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  function sectionProgress(el) { // 0 when section top hits viewport bottom, 1 when its bottom hits viewport top
    const r = el.getBoundingClientRect(), vh = innerHeight;
    return clamp((vh - r.top) / (r.height + vh), 0, 1);
  }
  function pageProgress() { return clamp(scrollY / (document.documentElement.scrollHeight - innerHeight), 0, 1); }

  // Typewriter: types each [data-type] element when it enters the viewport
  function typewriter(root = document) {
    const els = [...root.querySelectorAll('[data-type]')];
    els.forEach(el => { el.dataset.full = el.textContent; el.textContent = ''; el.classList.add('tw'); });
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, full = el.dataset.full, speed = +el.dataset.type || 38; let i = 0;
      const tick = () => { el.textContent = full.slice(0, ++i); if (i < full.length) setTimeout(tick, speed + Math.random() * speed * .8); else el.classList.add('tw-done'); };
      setTimeout(tick, +el.dataset.delay || 0);
    }), { threshold: 0.6 });
    els.forEach(el => io.observe(el));
  }

  window.S3 = { Sketch, G, rot, add, clamp, ease, lerp, rng, TAU, sectionProgress, pageProgress, typewriter };
})();
