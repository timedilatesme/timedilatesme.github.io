// site.js — the shell every page shares: nav, footer, link icons, citations, and one animation loop.
// Pages can sit in subfolders: links and assets are resolved from this script's own URL.
// To add a page: copy page-template.html, then add one line to SITE.nav below.
(function () {
  const ROOT = new URL('..', document.currentScript.src).href; // the site root (this file is assets/site.js)
  const SITE = {
    name: 'Paras Sharma',
    nav: [
      { href: 'index.html#research', label: 'Research', match: /^research\// },
      { href: 'publications.html', label: 'Publications' },
      { href: 'about.html', label: 'About' },
      { href: 'assets/docs/Paras_CV.pdf', label: 'CV' },
    ],
    email: 'paras.sharma@stonybrook.edu',
    links: [
      { href: 'https://scholar.google.com/citations?user=45Pod_4AAAAJ', label: 'Scholar' },
      { href: 'https://github.com/timedilatesme', label: 'GitHub' },
      { href: 'assets/docs/Paras_CV.pdf', label: 'CV' },
    ],
    // link icons, by destination (first match wins). Add a row here for a new kind of site.
    icons: [
      [/github\.com/, 'github'], [/scholar\.google/, 'googlescholar'], [/arxiv\.org/, 'arxiv'], [/readthedocs\.io/, 'readthedocs'],
      [/ascl\.net/, 'code'], [/\.pdf($|[?#])/, 'file'], [/^mailto:/, 'mail'], [/^https?:/, 'globe'],
    ],
  };
  const url = p => new URL(p, ROOT).href;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- nav + footer ----------
  const here = location.href.replace(ROOT, '').split('#')[0] || 'index.html';
  const nav = document.querySelector('nav.site');
  if (nav) nav.innerHTML = `<div class="wrap"><a class="me" href="${url('index.html')}" aria-label="${SITE.name}, home"><span class="full">${SITE.name}</span><span class="short">PS</span></a><span class="links-nav">` +
    SITE.nav.map(l => { const on = l.match ? l.match.test(here) : l.href === here; return `<a href="${url(l.href)}"${on ? ' class="on" aria-current="page"' : ''}>${l.label}</a>`; }).join('') + '</span>' +
    // theme toggle (assets/theme.js set the starting theme): moon = switch to dark, sun = switch to light (Lucide icons)
    '<button class="theme" type="button"><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' +
    '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg></button></div>';
  const themeBtn = nav && nav.querySelector('.theme'), root = document.documentElement;
  const label = () => themeBtn && themeBtn.setAttribute('aria-label', root.dataset.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  if (themeBtn) {
    if (!root.dataset.theme) root.dataset.theme = 'dark';
    label();
    themeBtn.onclick = () => {
      root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light'; label();
      try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    };
  }
  const foot = document.querySelector('footer.site');
  if (foot) foot.innerHTML = `<div class="wrap"><span class="links"><a href="mailto:${SITE.email}">${SITE.email}</a>${SITE.links.map(l => `<a href="${url(l.href)}">${l.label}</a>`).join('')}</span>` +
    `<span class="updated">© ${new Date().getFullYear()} ${SITE.name}</span></div>`;

  // ---------- citations: <div data-pubs="filter"> renders publications from DATA.pubs ----------
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function cite(p, o = {}) {
    const n = Math.max(3, p.authors.indexOf(DATA.me) + 1), more = p.etal || p.authors.length > n; // authors up to and including me (at least three), then et al.
    const au = p.authors.slice(0, n).map(a => a === DATA.me ? `<b>${a}</b>` : esc(a)).join(', ') + (more ? ', et al.' : '');
    const links = [p.arxiv && `<a href="https://arxiv.org/abs/${p.arxiv}">arXiv:${p.arxiv}</a>`, p.ascl && `<a href="https://ascl.net/${p.ascl}">ascl:${p.ascl}</a>`,
      p.github && `<a href="${p.github}">GitHub</a>`].filter(Boolean).join(' ');
    const kind = p.kind !== 'paper' ? `<span class="kind">${p.kind}</span>` : '';
    const meta = [p.venue, o.year !== false && p.year].filter(Boolean).map(esc).join(' · '); // the year is left out where entries are grouped by year
    return `<span class="t">${kind}${esc(p.title)}</span><span class="au">${au}${meta ? ` <span class="v">· ${meta}</span>` : ''}</span>${links ? `<span class="pl">${links}</span>` : ''}`;
  }
  function renderPubs(el, given, o) {
    if (!window.DATA) return;
    // filter: all | first | selected | software | a topic | ids:2607.01005,2603.17138 (in that order); or pass the list itself
    // selected: papers where I am first or second author, plus any marked pin: true
    const f = el.dataset.pubs || 'all', ids = f.startsWith('ids:') && f.slice(4).split(',');
    const pick = {
      all: () => true, first: p => p.first, software: p => p.kind === 'software',
      selected: p => p.kind === 'paper' && (p.pin || [0, 1].includes(p.authors.indexOf(DATA.me))),
    };
    const list = given || (ids ? ids.map(id => DATA.pubs.find(p => p.arxiv === id || p.ascl === id)).filter(Boolean)
      : DATA.pubs.filter(pick[f] || (p => p.topic === f)));
    el.innerHTML = list.map(p => `<li class="cite">${cite(p, o)}</li>`).join('') || '<li class="cite none">Nothing here yet.</li>';
  }
  document.querySelectorAll('[data-pubs]').forEach(renderPubs);

  // ---------- research pages: <body data-topic="slug"> gets its kicker and previous/next links from DATA.research ----------
  const topic = document.body.dataset.topic, R = window.DATA ? DATA.research : [], ti = R.findIndex(r => r.slug === topic);
  if (ti >= 0) {
    const k = document.querySelector('[data-topic-kicker]');
    if (k) k.innerHTML = `<span class="n">${R[ti].area}</span>Research topic ${ti + 1} of ${R.length}`;
    const pg = document.querySelector('[data-pager]'), all = { href: url('index.html#research'), small: 'Back to', b: 'All research' };
    const to = (r, small) => r ? { href: url(`research/${r.slug}.html`), small, b: r.title } : all;
    const prev = to(R[ti - 1], '← Previous'), next = to(R[ti + 1], 'Next →');
    if (pg) pg.innerHTML = [prev, next].map((l, i) => `<a class="panel noico${i ? ' next' : ''}" href="${l.href}"><small>${l.small}</small><b>${l.b}</b></a>`).join('');
  }

  // ---------- link icons: links in a row of links (.links), a citation (.pl) or the footer get their site's symbol;
  //            links inside running text stay plain ----------
  function icons(root = document) {
    root.querySelectorAll('a[href]:not(.noico)').forEach(a => {
      if (a.closest('nav.site, .noico') || a.querySelector('.ico')) return;
      const href = a.getAttribute('href'), hit = SITE.icons.find(([re]) => re.test(href)); if (!hit) return;
      if (!a.closest('.links, .pl, footer.site')) return;
      const i = document.createElement('span'); i.className = 'ico'; i.setAttribute('aria-hidden', 'true');
      i.style.setProperty('--i', `url(${url('assets/icons/' + hit[1] + '.svg')})`); a.prepend(i);
    });
  }
  icons();

  // ---------- plots: SVGs are inlined so their text uses the site font (an <img> can't load web fonts) ----------
  document.querySelectorAll('img[src$=".svg"]').forEach(img => fetch(img.src).then(r => r.text()).then(t => {
    const box = document.createElement('div'); box.innerHTML = t; const svg = box.querySelector('svg'); if (!svg) return;
    svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', img.alt);
    img.replaceWith(svg);
  }).catch(() => {}));

  // ---------- one animation loop; pages register their figures with Site.loop(fn) ----------
  const loops = [];
  function frame(ms) { for (const f of loops) f(ms); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);

  window.Site = { SITE, url, reduced, icons, renderPubs, loop: f => loops.push(f) };
})();
