# timedilatesme.github.io

Personal website of Paras Sharma, PhD student in Physics & Astronomy at Stony Brook University, working on strong gravitational lensing. Live at https://timedilatesme.github.io.

A static site with no build step: plain HTML, CSS and JavaScript, served by GitHub Pages.

- `assets/data.js` holds the site's facts (publications, research topics, education); pages render from it.
- `assets/site.js` builds the nav, footer, citations and link icons; `assets/theme.js` picks light or dark mode.
- `assets/viz/` holds the figures, ray-traced live in the browser (WebGL2).
- `research/` has one page per research topic; copy `research/_template.html` to add one.
- `tools/check.py` checks every arXiv entry against arXiv and every local link (`python3 tools/check.py`).

## The CV

The CV is built from the same facts as the website, so the two never disagree.

- Edit facts (education, publications, experience, awards, teaching, ...) in `assets/data.js` only.
- `cv/cvmain.tex` is the layout; `cv/generated/` is written by the build, so don't edit it by hand.
- `python3 tools/build_cv.py` regenerates the sections and compiles `assets/docs/Paras_CV.pdf` (needs node and latexmk).
- On every push to `main`, GitHub Actions (`.github/workflows/site.yml`) rebuilds the CV and deploys the site.
  This needs Settings → Pages → Source set to "GitHub Actions" once.

To preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
