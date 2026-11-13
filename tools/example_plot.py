"""Example of the site plot style. Placeholder data only, not a science result."""
import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
plt.style.use("tools/site.mplstyle")
rng = np.random.default_rng(1)
a = rng.lognormal(np.log(0.8), 0.35, 4000)
b = rng.lognormal(np.log(1.1), 0.30, 2500)
fig, ax = plt.subplots(figsize=(8, 3.6))
bins = np.linspace(0, 3, 50)
ax.hist(a, bins, histtype="step", lw=1.6, label="sample A")
ax.hist(b, bins, histtype="step", lw=1.6, label="sample B")
ax.axvline(np.median(a), color="#f2b45a", lw=1, ls="--")
ax.set_xlabel(r"$\theta_E$ [arcsec]"); ax.set_ylabel("count")
ax.set_title("placeholder data · style example")
ax.legend()
fig.savefig("assets/plots/example.svg")
