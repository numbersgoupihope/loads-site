import sys, numpy as np, soundfile as sf
from synth import *
D = 11.0
tr = Track(D)
IT = [1.7, 3.6, 5.6, 7.5]; END = 9.1
def pluck(m, d=1.0):
    f = hz(m); N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(d * SR))
    for i in range(len(out)):
        out[i] = buf[i % N]; buf[i % N] = .5 * (buf[i % N] + buf[(i + 1) % N]) * .995
    return out * .6
# cozy acoustic groove, 100 BPM, warm major
bpm = 100; b = 60 / bpm
prog_ = [[55, 59, 62, 67], [52, 55, 59, 64], [48, 52, 55, 60], [50, 54, 57, 62]]
roots = [43, 40, 36, 38]
M = Track(D)
for k in range(int(D / b) + 1):
    t = k * b; c = (k // 4) % 4; ch = prog_[c]
    for j, s16 in enumerate((0, .5)):
        M.add(t + s16 * b, pluck(ch[(k * 2 + j) % 4] + 12, .9), .32, pan=-.25 + .5 * j)
    if k % 2 == 0: M.add(t, kick(), .55)
    if k % 2 == 1: M.add(t, lp(clap(), 3000), .28)
    M.add(t + b / 2, shaker(), .18, pan=.3)
    if k % 4 == 0: M.add(t, bass(roots[c], b * 3.5), .5)
fade = np.ones(M.n); i0 = int((D - 1.0) * SR); fade[i0:] = np.linspace(1, 0, M.n - i0)
M.x *= fade[:, None]; tr.x += M.x * .62
tr.add(0.03, bell(79, 1.4), .35); tr.add(0.12, bell(83, 1.4), .3)
for a in IT: tr.add(a - .05, whoosh(.3), .25, pan=-.3)
# step 1: pie pop in, slice whoosh, bite + crunch
tr.add(IT[0] + .08, pop(1.0), .45)
tr.add(IT[0] + .7, whoosh(.45), .4, pan=.3)
def crunch():
    t = T(.25); return bp(rng.standard_normal(len(t)), 1500, 7000) * (np.abs(np.sin(2*np.pi*28*t)) ** 3) * np.exp(-t * 9)
tr.add(IT[0] + 1.15, pop(.55), .8); tr.add(IT[0] + 1.18, crunch(), .6)
# step 2: boat slides, glug pour, splat
tr.add(IT[1], whoosh(.4), .3, pan=-.5)
def glug():
    t = T(.12); f = 220 + 180 * t / .12; ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph) * np.sin(np.pi * t / .12) * .7
for k in range(5): tr.add(IT[1] + .68 + k * .14, glug(), .45)
def splat():
    t = T(.35); return lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 14) + np.sin(2*np.pi*90*t) * np.exp(-t * 20) * .6
tr.add(IT[1] + .82, splat(), .8)
tr.add(IT[1] + 1.05, pop(2.2), .25); tr.add(IT[1] + 1.25, pop(2.0), .25)
# step 3: belly stretch, button pop + boing
def stretch():
    t = T(.5); f = 120 + 160 * t / .5; ph = 2*np.pi*np.cumsum(f)/SR
    return lp(np.sign(np.sin(ph)), 900) * env(len(t), .05, .1) * .3
tr.add(IT[2] + .3, stretch(), .5)
tr.add(IT[2] + .75, pop(1.6), .7)
def boing():
    t = T(.6); f = 300 * (1 + .5 * np.exp(-t * 6) * np.sin(2*np.pi*14*t)); ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph) * np.exp(-t * 5) * .5
tr.add(IT[2] + .8, boing(), .5, pan=.4)
# step 4: tablecloth whoosh + gulp
tr.add(IT[3] + .5, whoosh(.5), .5, pan=-.3)
tr.add(IT[3] + 1.0, pop(.55), .8)
# end: chime + slurp
tr.add(END + .2, whoosh(.4), .3)
tr.add(END + .6, pop(1.1), .45)
for k, m in enumerate((79, 83, 86, 91)): tr.add(END + .62 + k * .07, bell(m), .3, pan=-.3 + .2 * k)
tr.add(END + 1.0, slurp(.5), .45, pan=.25)
out = master(tr.x, 0); sf.write(sys.argv[1], out, SR); print('ok')
