import sys, numpy as np, soundfile as sf
from synth import *
D = 14.0
tr = Track(D)
def saw(f, t): return 2 * ((f * t) % 1) - 1
def brass(midis, d, cutoff=2600):
    t = T(d); s = np.zeros(len(t))
    for m in midis:
        for det in (.996, 1.0, 1.005): s += saw(hz(m) * det, t)
    return lp(s, cutoff) * env(len(t), .015, .35) * np.exp(-t * 1.2) / (3 * len(midis))
def timpani(m=40, d=1.2):
    t = T(d); f = hz(m) * (1 + .15 * np.exp(-t * 12)); ph = 2*np.pi*np.cumsum(f)/SR
    return (np.sin(ph) + .3*np.sin(2*ph)) * np.exp(-t * 3.2) + lp(rng.standard_normal(len(t)), 500) * np.exp(-t * 30) * .5
def violin(m, d, vib=5.5):
    t = T(d); f = hz(m) * (1 + .006 * np.sin(2*np.pi*vib*t) * np.minimum(1, t / .25)); ph = 2*np.pi*np.cumsum(f)/SR
    s = 2 * ((ph / (2*np.pi)) % 1) - 1
    return lp(s, 3200) * env(len(t), .12, .2) * .5
def pluck(m, d=1.0):
    f = hz(m); N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(d * SR))
    for i in range(len(out)):
        out[i] = buf[i % N]; buf[i % N] = .5 * (buf[i % N] + buf[(i + 1) % N]) * .996
    return out * .6
def choir(midis, d):
    t = T(d); s = np.zeros(len(t))
    for m in midis:
        for det in (.995, 1.0, 1.006): s += np.sin(2*np.pi*hz(m)*det*t) * (1 + .1*np.sin(2*np.pi*5*t))
    return lp(s, 1800) * env(len(t), .3, .6) / (3 * len(midis))

# ---- scene 1: dryer buzz, door, sock flies out ----
t = T(.35); buzz = np.sign(np.sin(2*np.pi*220*t)) * .25 + np.sin(2*np.pi*440*t) * .2
tr.add(0.0, lp(buzz, 2000) * env(len(t), .005, .05), .5)
t = T(1.9); drum = lp(rng.standard_normal(len(t)), 250) * (0.6 + 0.4*np.sin(2*np.pi*1.5*t)) * env(len(t), .05, .4)
tr.add(0, drum, .35)
tr.add(0.3, pop(1.6), .4); tr.add(0.32, whoosh(.5), .45)
tr.add(0.85, thud(), .7); tr.add(0.86, pop(.9), .45)
tr.add(1.1, pop(2.4), .25, pan=-.5); tr.add(1.45, pop(2.4), .25, pan=.5)
tr.add(0.4, choir([57, 60, 64], 1.6), .35)

# ---- scene 2: DUN DUN DUN + sad violin ----
for k, (a, ch) in enumerate([(1.9, [45, 52, 57, 60]), (2.15, [46, 53, 58, 61]), (2.4, [47, 54, 59, 62])]):
    tr.add(a, brass([m + 12 for m in ch], .6 if k < 2 else 1.2), 1.0)
    tr.add(a, timpani(40 + k), .8)
tr.add(2.55, violin(69, .32), .5); tr.add(2.87, violin(67, .3), .5); tr.add(3.15, violin(65, .4), .5)

# ---- scene 3: title hit + harp + choir ----
tr.add(3.5, timpani(36, 1.8), 1.0)
t = T(1.6); tr.add(3.5, hp(rng.standard_normal(len(t)), 4500) * np.exp(-t * 2.5), .35)
tr.add(3.5, brass([57, 60, 64, 69], 1.6, 3200), .8)
for k, m in enumerate([57, 60, 64, 69, 72, 76, 81, 84]): tr.add(3.55 + k * .045, pluck(m, .9), .35, pan=-.4 + k * .1)
tr.add(3.6, choir([57, 64, 69, 72], 1.7), .5)

# ---- scene 4: sad melody, poster slap, sigh ----
prog_ = [([57, 60, 64], 45), ([53, 57, 60], 41), ([48, 52, 55], 48), ([52, 56, 59], 40)]
for k, (ch, r) in enumerate(prog_):
    a = 5.3 + k * .8
    tr.add(a, keys(ch, .9, bright=.6), .5); tr.add(a, bass(r, .8), .4)
for a, m, d in [(5.35, 76, .5), (5.85, 74, .3), (6.15, 72, .55), (6.75, 71, .4), (7.15, 72, .35), (7.5, 69, .9)]:
    tr.add(a, violin(m, d), .4)
t = T(.25); slap = bp(rng.standard_normal(len(t)), 600, 4000) * np.exp(-t * 30)
tr.add(5.75, slap, .8); tr.add(5.75, thud() * .5, .5)
def rip(): t = T(.14); return bp(rng.standard_normal(len(t)), 2000, 8000) * np.sin(np.pi*t/.14)
tr.add(5.98, rip(), .4, pan=-.3); tr.add(6.1, rip(), .4, pan=.3)
t = T(.8); sigh = bp(rng.standard_normal(len(t)), 300, 1600) * np.sin(np.pi * t / .8) * np.linspace(1, .3, len(t))
tr.add(7.1, sigh, .35)

# ---- scene 5: hopeful outro, footsteps ----
prog2 = [([60, 64, 67], 48), ([55, 59, 62], 43), ([57, 60, 64], 45), ([53, 57, 60], 41)]
for k, (ch, r) in enumerate(prog2):
    a = 8.5 + k * .68
    for j, m in enumerate(ch + [ch[0] + 12]): tr.add(a + j * .085, pluck(m + 12, .7), .3, pan=-.2 + j * .12)
    tr.add(a, bass(r, .65), .35)
tr.add(8.5, choir([60, 64, 67, 72], 2.7), .35)
for k in range(7): tr.add(8.65 + k * .343, pop(1.3 - k * .05), .18 * (1 - k * .1))

# ---- scene 6: Big Load's beat, record scratch freeze ----
bpm = 96; b = 60 / bpm
for k in range(4):
    a = 11.2 + k * b
    if a > 12.25: break
    tr.add(a, kick(), .7)
    if k % 2: tr.add(a, clap(), .4)
    tr.add(a + b / 2, hat(), .25)
    tr.add(a, bass(41 if k < 2 else 43, b * .8), .5)
def scratch():
    t = T(.35); f = 600 + 900 * np.sin(2*np.pi*3*t); ph = 2*np.pi*np.cumsum(f)/SR
    return bp(rng.standard_normal(len(t)), 400, 4000) * (0.5 + 0.5*np.sin(ph)) * np.sin(np.pi*t/.35) * 1.2
tr.add(12.2, scratch(), .7)
tr.add(12.35, brass([57, 60, 63], .5), .7); tr.add(12.35, timpani(41, .8), .5)
tr.add(12.4, pop(1.2), .4)
tr.add(12.9, pop(1.1), .45)
tr.add(12.95, slurp(.5), .4, pan=.25)
out = master(tr.x, 0); sf.write(sys.argv[1], out, SR); print('ok')
