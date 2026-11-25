import sys, numpy as np, soundfile as sf
from synth import *
D = 15.5
tr = Track(D)
S = {'hook': (0, 2.4), 's1': (2.4, 4.6), 's2': (4.6, 6.8), 's3': (6.8, 8.8), 's4': (8.8, 11.2), 's5': (11.2, 13.2), 'end': (13.2, 15.5)}

# ---- music: airy spa house, 108 BPM, D minor-ish. Pads only during the hook, groove from 2.4 ----
bpm = 108; b = 60 / bpm
chords = [[62, 65, 69, 72], [58, 62, 65, 69], [60, 64, 67, 70], [57, 60, 64, 67]]   # Dm9-ish, Bbmaj7, C7, Am7
roots = [38, 34, 36, 33]
M = Track(D)
def pad(midis, d):
    t = T(d); s = np.zeros(len(t))
    for m in midis:
        f = hz(m)
        for det in (0.997, 1.0, 1.004): s += np.sin(2*np.pi*f*det*t + det*7)
    return lp(s, 2200) * env(len(t), 0.5, 0.8) / (3 * len(midis))
bar = 4 * b
for k in range(int(D / bar) + 1):
    t0 = k * bar; c = k % 4
    M.add(t0, pad(chords[c], bar + 0.8), .55)
groove_start = 2.4
nb = int((D - groove_start) / b) + 1
for k in range(nb):
    t = groove_start + k * b; c = int((t // bar)) % 4
    M.add(t, kick(), .7)
    if k % 2 == 1: M.add(t, lp(clap(), 4000), .28)
    M.add(t + b / 2, hat(open_=True), .18, pan=.3)
    for s16 in (1, 3): M.add(t + s16 * b / 4, shaker(), .16, pan=-.3)
    M.add(t + b / 2, bass(roots[c] + 12, b * .45), .55)
    if k % 4 == 2: M.add(t + b * .5, keys([m + 12 for m in chords[c]], b * 1.2, bright=.9), .32, pan=-.2)
fade = np.ones(M.n); i0 = int((D - 1.3) * SR); fade[i0:] = np.linspace(1, 0, M.n - i0)
M.x *= fade[:, None]
tr.x += M.x * .62

# ---- hook ----
def singing_bowl(m, d=3.0):
    t = T(d); f = hz(m)
    return (np.sin(2*np.pi*f*t) + .6*np.sin(2*np.pi*2.71*f*t + .3)*np.exp(-t*1.5) + .3*np.sin(2*np.pi*5.1*f*t)*np.exp(-t*3)) * np.exp(-t*1.1) * (1 + .15*np.sin(2*np.pi*3.2*t)) * env(len(t), .004, .3)
tr.add(0.03, singing_bowl(69), .45)
tr.add(1.05, womp(55), .4); tr.add(1.42, womp(52, .6), .4)

# ---- step 1: Big Load arrives, eats the hoodie ----
tr.add(2.42, whoosh(.6), .5, pan=.5)
tr.add(3.0, thud(), .75)
tr.add(3.12, pop(1.4), .5, pan=-.3)
tr.add(3.56, pop(.55), .8)          # gulp
tr.add(3.74, glint(), .55, pan=.3)

# ---- swipes between steps ----
for k in ('s2', 's3', 's4', 's5', 'end'):
    tr.add(S[k][0] - .32, whoosh(.62), .42, pan=-.2)

# ---- step 2: washer ----
a, z = S['s2']
t = T(z - a); nz = rng.standard_normal(len(t))
swish = lp(nz, 900) * (0.6 + 0.4*np.sin(2*np.pi*0.83*t)) * env(len(t), .25, .3)
tr.add(a, swish, .5)
for i in range(16):
    tr.add(a + .15 + i * .12 + (i % 3) * .03, pop(1.8 + (i % 5) * .25), .18, pan=(i % 5 - 2) * .2)

# ---- step 3: dryer hum + steam ----
a, z = S['s3']
t = T(z - a)
hum = (np.sin(2*np.pi*98*t) * .5 + lp(rng.standard_normal(len(t)), 300) * .6) * (1 + .3*np.sin(2*np.pi*1.1*t)) * env(len(t), .3, .3)
hiss = hp(rng.standard_normal(len(t)), 5000) * (0.5 + 0.5*np.sin(2*np.pi*0.9*t)**2) * env(len(t), .4, .3) * .25
tr.add(a, hum, .35); tr.add(a, hiss, .35, pan=.2)

# ---- step 4: folds ----
a = S['s4'][0]
def fwip():
    t = T(.18); return bp(rng.standard_normal(len(t)), 1500, 6000) * np.sin(np.pi * t / .18) ** 2
for k, d in enumerate((.55, .95, 1.35)): tr.add(a + d, fwip(), .55, pan=(-.4, .4, 0)[k])
tr.add(a + 1.45, whoosh(.35), .3)
tr.add(a + 2.08, thud() * .6, .6)
for k, m in enumerate((81, 85, 88, 93)): tr.add(a + 2.05 + k * .07, bell(m), .3, pan=-.3 + .2 * k)

# ---- step 5: chauffeur ----
a = S['s5'][0]
tr.add(a - .1, whoosh(.6), .6, pan=-.6)
def honk(d=.13):
    t = T(d); s = np.sign(np.sin(2*np.pi*415*t)) + np.sign(np.sin(2*np.pi*523*t))
    return lp(s, 2500) * env(len(t), .005, .02) * .25
tr.add(a + .38, honk(), .7); tr.add(a + .55, honk(), .7)
tr.add(a + .5, thud() * .5, .6)
tr.add(a + 1.02, pop(1.3), .45)
tr.add(a + 1.43, thud() * .4, .5)
tr.add(a + 1.5, bell(76, 1.6), .4); tr.add(a + 1.78, bell(72, 1.8), .4)   # ding-dong

# ---- end card ----
a = S['end'][0]
tr.add(a + .55, pop(1.1), .5)
for k, m in enumerate((84, 88, 91, 96)): tr.add(a + .6 + k * .07, bell(m), .28, pan=-.3 + .2 * k)
tr.add(a + 1.0, slurp(.5), .45, pan=.3)

out = master(tr.x, 0)
sf.write(sys.argv[1] if len(sys.argv) > 1 else '/tmp/spa.wav', out, SR)
print('ok')
