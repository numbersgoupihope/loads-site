import sys, numpy as np, soundfile as sf
from synth import *
D = 11.0
tr = Track(D)
IT = [1.6, 3.0, 4.4, 5.8, 7.2]; STAMP = [a + .55 for a in IT]; END = 8.9

# ---- beat: 96 BPM boom-bap with swagger ----
bpm = 96; b = 60 / bpm
chords = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]]
roots = [45, 41, 43, 40]
M = Track(D)
for k in range(int(D / b) + 1):
    t = k * b; bar = k // 4; c = bar % 4
    beat = k % 4
    if beat in (0,) or (beat == 2 and k % 8 == 6): M.add(t, kick(), .9)
    if beat == 2 and k % 8 != 6: M.add(t + b * .5, kick(), .6)
    if beat in (1, 3): M.add(t, clap(), .55)
    for h in range(2):
        sw = b * .5 * (.58 if h else 0)
        M.add(t + (b * .5 * h if not h else sw * 1.0 + b * .0), hat(), .3 if h else .22, pan=.25)
    if beat == 0: M.add(t, keys([m + 12 for m in chords[c]], b * 3.6, bright=1.1), .42, pan=-.15)
    M.add(t, bass(roots[c], b * .8), .7)
    if beat == 3: M.add(t + b * .5, bass(roots[c] + 7, b * .3), .4)
# drop the beat out for a beat under each stamp, so the hit lands hard
gate = np.ones(M.n)
for s in STAMP:
    i0, i1 = int((s - .05) * SR), int((s + .12) * SR); gate[i0:i1] = .25
fade = np.ones(M.n); i0 = int((D - 1.0) * SR); fade[i0:] = np.linspace(1, 0, M.n - i0)
M.x *= (gate * fade)[:, None]
tr.x += M.x * .6

def stamp_hit(big=False):
    t = T(.5)
    body = kick(.4) * 1.0
    slap = bp(rng.standard_normal(len(t)), 300, 2500) * np.exp(-t * 25) * .9
    s = np.zeros(len(t)); s[:len(body)] += body; s += slap
    if big:
        t2 = T(.5); s += lp(rng.standard_normal(len(t2)), 900) * np.exp(-t2 * 8) * .5
    return s
for i, s in enumerate(STAMP):
    tr.add(s, stamp_hit(i == 4), .9 if i == 4 else .75)
    tr.add(s - .2, whoosh(.22), .25)
tr.add(STAMP[4] + .18, stamp_hit(True), .7)       # NEVER ... EVER
for a in IT: tr.add(a - .05, whoosh(.3), .2, pan=-.3)
# item 3: sock wiggle squeaks
for k in range(4): tr.add(STAMP[2] + .1 + k * .17, pop(2.2 - .2 * k), .25, pan=.3)

# ---- end: ka-ching + coins ----
def kaching():
    s = bell(98, .9) * .6 + bell(103, .9) * .5
    t = T(.9); s = s[:len(t)]
    s += hp(rng.standard_normal(len(t)), 6000) * np.exp(-t * 6) * .35
    return s
tr.add(END + .25, whoosh(.5), .4)
tr.add(END + .3, kaching(), .7)
for i in range(10):
    t = T(.25); f = 3000 + (i * 397) % 2400
    tr.add(END + .45 + i * .07, np.sin(2*np.pi*f*t) * np.exp(-t * 18) * .4, .35, pan=(i % 5 - 2) * .25)
tr.add(END + .72, pop(1.1), .5)
tr.add(END + 1.0, slurp(.5), .45, pan=.25)

out = master(tr.x, 0)
sf.write(sys.argv[1], out, SR); print('ok')
