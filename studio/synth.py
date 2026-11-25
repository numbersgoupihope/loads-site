"""Small sound kit for the Loads reels. Everything is synthesized here (no samples)."""
import numpy as np
from scipy.signal import butter, lfilter
SR = 44100
rng = np.random.default_rng(3)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def T(d): return np.arange(int(d * SR)) / SR
def env(n, a, r, hold=None):
    t = np.arange(n) / SR; L = n / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.clip((L - t) / max(r, 1e-4), 0, 1)
    return e
def lp(x, f, o=2): b, a = butter(o, min(f, SR / 2 - 100) / (SR / 2)); return lfilter(b, a, x)
def hp(x, f, o=2): b, a = butter(o, f / (SR / 2), 'high'); return lfilter(b, a, x)
def bp(x, lo, hi, o=2): b, a = butter(o, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)

class Track:
    def __init__(self, secs): self.n = int(secs * SR); self.x = np.zeros((self.n, 2))
    def add(self, t, sig, g=1.0, pan=0.0):
        i = int(t * SR)
        if i >= self.n or i + len(sig) <= 0: return
        if i < 0: sig = sig[-i:]; i = 0
        j = min(self.n, i + len(sig)); s = sig[: j - i] * g
        self.x[i:j, 0] += s * np.sqrt(0.5 * (1 - pan)) * 1.414
        self.x[i:j, 1] += s * np.sqrt(0.5 * (1 + pan)) * 1.414

# ---- instruments ----
def keys(midis, d, bright=1.0):
    t = T(d); s = np.zeros(len(t))
    for m in midis:
        f = hz(m)
        s += (np.sin(2*np.pi*f*t) + 0.35*bright*np.sin(2*np.pi*2*f*t)*np.exp(-t*3) + 0.12*bright*np.sin(2*np.pi*3*f*t)*np.exp(-t*5))
    trem = 1 + 0.12 * np.sin(2*np.pi*4.5*t)
    return s * trem * np.exp(-t * 0.9) * env(len(t), 0.01, 0.25) / max(1, len(midis))
def bass(m, d):
    t = T(d); f = hz(m)
    s = np.sin(2*np.pi*f*t) + 0.25*np.sin(2*np.pi*2*f*t)
    return s * env(len(t), 0.005, 0.06) * np.exp(-t * 2.2)
def kick(d=0.35):
    t = T(d); f = 50 + 120 * np.exp(-t * 28)
    ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph) * np.exp(-t * 9) + 0.15 * rng.standard_normal(len(t)) * np.exp(-t * 120)
def clap(d=0.25):
    t = T(d); nz = bp(rng.standard_normal(len(t)), 900, 3500)
    e = np.exp(-t * 22) + 0.6*np.exp(-np.maximum(t-0.012,0)*30)*(t>0.012) + 0.4*np.exp(-np.maximum(t-0.024,0)*30)*(t>0.024)
    return nz * e * 1.4
def hat(d=0.06, open_=False):
    t = T(0.22 if open_ else d); nz = hp(rng.standard_normal(len(t)), 7000)
    return nz * np.exp(-t * (14 if open_ else 70)) * 0.6
def shaker(d=0.08):
    t = T(d); nz = bp(rng.standard_normal(len(t)), 5000, 11000)
    return nz * np.sin(np.pi * t / d) ** 2 * 0.35
def crackle(d, density=18):
    s = np.zeros(int(d * SR))
    for _ in range(int(d * density)):
        i = rng.integers(0, len(s) - 200); s[i:i+60] += rng.standard_normal(60) * np.exp(-np.arange(60) / 8) * rng.uniform(.2, 1)
    return hp(s, 1500) * 0.25 + lp(rng.standard_normal(len(s)), 3000) * 0.012

# ---- effects ----
def tick():
    t = T(0.03); return np.sin(2*np.pi*2400*t) * np.exp(-t * 260) * 0.6
def bell(m, d=1.2):
    t = T(d); f = hz(m)
    return (np.sin(2*np.pi*f*t) + 0.5*np.sin(2*np.pi*2.76*f*t)*np.exp(-t*6) + 0.25*np.sin(2*np.pi*5.4*f*t)*np.exp(-t*9)) * np.exp(-t * 3.2) * env(len(t), 0.002, 0.1)
def whoosh(d, up=True):
    t = T(d); nz = rng.standard_normal(len(t)); out = np.zeros(len(t)); seg = int(0.02 * SR)
    for k in range(0, len(t), seg):
        p = k / len(t); fc = 400 + 5000 * (p if up else 1 - p)
        out[k:k+seg] = bp(nz[max(0,k-2000):k+seg], max(80, fc*0.5), min(18000, fc*1.6))[-len(out[k:k+seg]):]
    return out * np.sin(np.pi * t / d) ** 1.5 * 0.9
def thud():
    t = T(0.35); f = 45 + 60*np.exp(-t*20); ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph) * np.exp(-t * 10) * 1.1 + lp(rng.standard_normal(len(t)), 600) * np.exp(-t * 40) * 0.6
def pop(pitch=1.0):
    t = T(0.12); f = (900 - 500 * (t / 0.12)) * pitch; ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph) * np.exp(-t * 30) * 0.8
def glint():
    t = T(0.6)
    return (np.sin(2*np.pi*2637*t) + 0.6*np.sin(2*np.pi*3951*t)) * np.exp(-t * 7) * env(len(t), 0.002, 0.05) * 0.35
def riser(d):
    t = T(d); f = 200 * (8 ** (t / d)); ph = 2*np.pi*np.cumsum(f)/SR
    return (np.sin(ph) * 0.25 + whoosh(d) * 0.6) * (t / d) ** 1.5
def slurp(d=0.5):
    t = T(d); nz = rng.standard_normal(len(t)); out = np.zeros(len(t)); seg = int(0.015*SR)
    for k in range(0, len(t), seg):
        fc = 700 + 500*np.sin(2*np.pi*14*k/SR) + 400*(k/len(t))
        out[k:k+seg] = bp(nz[max(0,k-1500):k+seg], fc*0.7, fc*1.4)[-len(out[k:k+seg]):]
    return out * (0.5 + 0.5*np.sin(2*np.pi*9*t)**2) * np.sin(np.pi*t/d) * 0.7
def womp(m, d=0.42):
    t = T(d); f = hz(m) * (1 - 0.06 * t / d); ph = 2*np.pi*np.cumsum(f)/SR
    s = np.sign(np.sin(ph)) * 0.3 + np.sin(ph)
    return lp(s, 1400) * env(len(t), 0.02, 0.12) * (1 + 0.2*np.sin(2*np.pi*6*t)) * 0.4

def tape_stop(x, start_s, dur_s):
    """slow a mono buffer down to a stop from start_s over dur_s (pitch drops to zero)"""
    i0 = int(start_s * SR); n = int(dur_s * SR)
    rate = np.linspace(1, 0, n) ** 1.3
    pos = i0 + np.cumsum(rate)
    seg = np.interp(pos, np.arange(len(x)), x)
    y = x.copy(); y[i0:i0+n] = seg * np.linspace(1, 0.2, n); y[i0+n:] = 0
    return y

def master(x, gain_db=0.0):
    x = x * (10 ** (gain_db / 20))
    x = np.tanh(x * 1.1) / np.tanh(1.1)
    return x / max(1e-9, np.max(np.abs(x))) * 0.89
