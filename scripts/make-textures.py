"""Generate seamless, photographic-style material textures for Cryptex.

Run:  python scripts/make-textures.py      (needs numpy + Pillow)
All noise is built in the frequency domain, so every texture tiles seamlessly.
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'tex')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def noise(h, w, beta=2.0, sx=1.0, sy=1.0, lo=0.0, hi=1.0):
    """Periodic 1/f^beta noise. sx/sy < 1 stretches features along that axis."""
    F = np.fft.fft2(rng.standard_normal((h, w)))
    ky = np.fft.fftfreq(h)[:, None] / sy
    kx = np.fft.fftfreq(w)[None, :] / sx
    k = np.sqrt(kx * kx + ky * ky)
    k[0, 0] = 1e9
    F /= k ** (beta / 2)
    if lo or hi < 1:
        F[(k < lo) | (k > hi)] = 0
    n = np.real(np.fft.ifft2(F))
    n -= n.min(); n /= n.max()
    return n


def ramp(t, stops):
    """Map 0..1 to colour via [(pos, (r,g,b)), ...]."""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (t >= p0) & (t <= p1)
        f = ((t - p0) / max(1e-9, p1 - p0))[m][:, None]
        out[m] = np.array(c0) * (1 - f) + np.array(c1) * f
    return out


def save(arr, name, q=84):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=q, optimize=True)
    print(name, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')


# ---------- Walnut desk: horizontal planks, growth rings, fibres, pores ----------
H = W = 1024
y = np.arange(H)[:, None] * np.ones((1, W))
warp = noise(H, W, 3.2) * 2 - 1
rings = 0.5 + 0.5 * np.sin(y / H * 2 * np.pi * 9 + warp * 9 + (noise(H, W, 2.6) - .5) * 5)
rings = rings ** 1.6
fibres = noise(H, W, 1.1, sx=0.018, sy=1.0)
pores = (noise(H, W, 0.6, sx=0.06) > 0.86).astype(float)
t = 0.22 * rings + 0.58 * fibres + 0.2 * noise(H, W, 3.0, sx=0.4)
t -= pores * 0.18
wood = ramp(t, [(0, (30, 16, 8)), (.3, (52, 29, 15)), (.55, (74, 42, 22)), (.8, (98, 59, 31)), (1, (122, 76, 41))])
plank = H // 4
for i in range(4):                      # per-plank tone + seams
    wood[i * plank:(i + 1) * plank] *= 0.9 + 0.2 * rng.random()
    wood[i * plank:i * plank + 2] *= 0.35
    wood[i * plank + 2:i * plank + 4] *= 0.75
save(wood, 'walnut.jpg', 82)

# ---------- Aged paper ----------
S = 512
blot = noise(S, S, 3.2)
fib = noise(S, S, 0.9)
streak = noise(S, S, 1.2, sx=0.3)
paper = np.ones((S, S, 3)) * np.array([243, 234, 210])
paper += ((blot - .5) * 22)[..., None] * np.array([1, 1.05, 1.4])
paper += ((fib - .5) * 12)[..., None]
paper += ((streak - .5) * 6)[..., None]
save(paper, 'paper.jpg')

# ---------- Manila card ----------
man = np.ones((S, S, 3)) * np.array([222, 192, 128])
man += ((noise(S, S, 3.0) - .5) * 26)[..., None] * np.array([1, 1, 1.3])
man += ((noise(S, S, 0.8) - .5) * 16)[..., None]
man += ((noise(S, S, 1.1, sx=0.12) - .5) * 14)[..., None]
save(man, 'manila.jpg')

# ---------- Cork board ----------
g1 = noise(S, S, 1.0, lo=0.02, hi=0.25)
g2 = noise(S, S, 1.4)
cells = np.floor(g1 * 7) / 7
t = 0.55 * cells + 0.3 * g2 + 0.15 * noise(S, S, 0.5)
cork = ramp(t, [(0, (92, 56, 30)), (.35, (150, 102, 60)), (.65, (186, 136, 86)), (1, (214, 168, 112))])
specks = noise(S, S, 0.3) > 0.9
cork[specks] *= 0.55
save(cork, 'cork.jpg')

# ---------- Brushed aluminium (light, for nameplates/bars) ----------
br = noise(S, S, 1.0, sx=0.008, sy=1.0)
br2 = noise(S, S, 2.5)
al = np.ones((S, S, 3)) * 186 + ((br - .5) * 60)[..., None] + ((br2 - .5) * 14)[..., None]
save(al * np.array([1, 1.01, .98]), 'brushed-light.jpg')

# ---------- Dark anodised gunmetal (faceplates) ----------
gm = np.ones((S, S, 3)) * np.array([50, 56, 49]) + ((br - .5) * 22)[..., None] + ((br2 - .5) * 10)[..., None]
save(gm, 'brushed-dark.jpg')

# ---------- Black crinkle paint (instrument cases / background) ----------
n = noise(S, S, 1.6, lo=0.03, hi=0.45)
ridge = 1 - np.abs(n - 0.5) * 2
ridge = ridge ** 6
crk = np.ones((S, S, 3)) * np.array([26, 30, 26]) + (ridge * 14)[..., None] + ((noise(S, S, 0.7) - .5) * 8)[..., None]
save(crk, 'crinkle.jpg')

# ---------- Beige moulded plastic (monitor housing) ----------
pl = np.ones((S, S, 3)) * np.array([212, 204, 182]) + ((noise(S, S, 0.4) - .5) * 10)[..., None] + ((noise(S, S, 3) - .5) * 8)[..., None]
save(pl, 'plastic.jpg')
