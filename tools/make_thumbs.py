# make_thumbs.py — the one research-card still that is a picture rather than a live drawing: the solar corona,
# cropped from Fig. 7 of Singh, Sharma et al. (2026) (the polarization-coloured, MGN-enhanced HDR image),
# centred on the Sun and leaving out the figure's compass. The other cards are drawn live by assets/viz/thumbs.js.
# Usage (needs numpy, Pillow; the arXiv source of 2610.26231):
#   python make_thumbs.py expnorm_hdr_solar_frame.png ../assets/img/research
import sys, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
CORONA, OUT = sys.argv[1:3]
W, H = 960, 720                                     # 4:3, twice the card's size
c = Image.open(CORONA).convert('RGB'); w, h = c.size
low = c.crop((0, h // 2, w, h))                     # the lower panel: HDR + MGN enhancement
a = np.asarray(low, np.float32).mean(-1); rows = np.nonzero((a < 245).mean(1) > 0.5)[0]   # trim white margins and title
cols = np.nonzero((a[rows[0]:rows[-1]] < 245).mean(0) > 0.5)[0]
low = low.crop((cols[0] + 6, rows[0] + 6, cols[-1] - 6, rows[-1] - 6)); lw, lh = low.size
# the Sun: the centre of the saturated, coloured rim along the Moon's edge
px = np.asarray(low, np.float32); sat = px.max(-1) - px.min(-1)
yy, xx = np.nonzero(sat > np.percentile(sat, 99.5)); cx, cy = int(np.median(xx)), int(np.median(yy))
ch = int(lh * 0.62); cw = ch * 4 // 3          # tall enough for the streamers, short enough to leave out the compass (lower right)
x0 = min(max(cx - cw // 2, 0), lw - cw); y0 = min(max(cy - ch // 2, 0), lh - ch)
print('sun at', cx, cy, 'of', lw, lh)
low.crop((x0, y0, x0 + cw, y0 + ch)).resize((W, H), Image.LANCZOS).save(f'{OUT}/corona.jpg', quality=87)
