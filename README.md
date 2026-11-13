# timedilatesme.github.io

Personal website of Paras Sharma, PhD student in Physics & Astronomy at Stony Brook University, working on strong gravitational lensing. Live at https://timedilatesme.github.io.

A static site with no build step: plain HTML, CSS and JavaScript, served by GitHub Pages.

- `assets/data.js` holds the site's facts (publications, research topics, education); pages render from it.
- `assets/site.js` builds the nav, footer, citations and link icons; `assets/theme.js` picks light or dark mode.
- `assets/viz/` holds the figures, ray-traced live in the browser (WebGL2).
- `research/` has one page per research topic; copy `research/_template.html` to add one.
- `tools/check.py` checks every arXiv entry against arXiv and every local link (`python3 tools/check.py`).

To preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
