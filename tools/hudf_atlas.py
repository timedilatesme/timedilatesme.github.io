# hudf_atlas.py — builds the hero's real Hubble images from the Hubble Ultra Deep Field (ESA/Hubble heic0406a,
# credit NASA, ESA, S. Beckwith (STScI) and the HUDF Team; CC BY 4.0, https://esahubble.org/images/heic0406a/):
#   assets/img/hudf-galaxies.jpg  3 tiles of 256px: the nearer source, the farther source, the lens (an elliptical),
#                                 sky subtracted, neighbours faded by a soft round mask
#   assets/img/hudf-sky.jpg       a 1600px patch of the field with no stars, sky subtracted: the lensed background
# Usage: python hudf_atlas.py heic0406a.jpg ../assets/img   (needs numpy, Pillow; the 6200px "large" JPEG)
import sys, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
im = Image.open(sys.argv[1]); out = sys.argv[2]
G = [ # (cx, cy, half-size px, mask radius as a fraction of half-size, noise floor in sigma)
  (2492, 1937, 95, 0.92, 1.5),   # a blue, clumpy spiral: the nearer source
  (170, 530, 85, 0.95, 1.5),     # a red spiral with bright knots: the farther source
  (4780, 2760, 100, 0.85, 0.5)]  # a round elliptical: the lens (low floor keeps its faint halo)
T = 256; A = np.zeros((T, len(G) * T, 3), np.float32)
yy, xx = np.mgrid[0:T, 0:T]; r = np.hypot(xx - (T - 1) / 2, yy - (T - 1) / 2) / (T / 2)
for i, (cx, cy, h, m, k) in enumerate(G):
  c = np.asarray(im.crop((cx - h, cy - h, cx + h, cy + h)).resize((T, T), Image.LANCZOS), np.float32) / 255
  sky = np.median(c[r > 0.9], axis=0); noise = np.std(c[r > 0.9] - sky)
  c = np.clip(c - sky - k * noise, 0, 1)                      # drop the sky and its speckle
  mask = np.clip((m - r) / (0.25 * m), 0, 1); mask = mask * mask * (3 - 2 * mask)
  A[:, i * T:(i + 1) * T] = c * mask[..., None]
Image.fromarray((np.clip(A, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{out}/hudf-galaxies.jpg', quality=88)
# the background: a star-free corner of the field (stars would wrongly be lensed)
s = np.asarray(im.crop((4560, 620, 6160, 2220)).resize((1024, 1024), Image.LANCZOS), np.float32) / 255
sky = np.median(s.reshape(-1, 3), axis=0); noise = np.std(s - sky)
s = np.clip(s - sky - 0.5 * noise, 0, 1)
Image.fromarray((s * 255 + 0.5).astype(np.uint8)).save(f'{out}/hudf-sky.jpg', quality=86)
