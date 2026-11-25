import sys, numpy as np, soundfile as sf
from synth import *
D = 8.0; PAD = 1.5
tr = Track(D + PAD)
chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]]
roots = [48, 45, 41, 43]
def fwip(d=.16, lo=1800, hi=7000):
    t = T(d); return bp(rng.standard_normal(len(t)), lo, hi) * np.sin(np.pi * t / d) ** 2
def flump():
    t = T(.3)
    body = np.sin(2*np.pi*np.cumsum(70 + 90*np.exp(-t*30))/SR) * np.exp(-t * 14)
    cloth = lp(rng.standard_normal(len(t)), 1200) * np.exp(-t * 22) * .8
    return body * .9 + cloth
for c in range(8):
    t0 = c * 1.0
    tr.add(t0 + .02, whoosh(.16), .12)
    tr.add(t0 + .17, fwip(), .5, pan=-.25)
    tr.add(t0 + .42, fwip(.14, 2500, 9000), .45, pan=.25)
    tr.add(t0 + .66, whoosh(.17), .15)
    tr.add(t0 + .82, flump(), .75)
    # music locked to the landings: kick on each landing, clap between, soft keys per chord
    tr.add(t0 + .82, kick(), .45)
    tr.add(t0 + .32, lp(clap(), 3500), .2)
    for h in range(4): tr.add(t0 + .07 + h * .25, hat(), .14 if h % 2 else .08, pan=.3)
    tr.add(t0 + .82, bass(roots[(c // 2) % 4], .45), .45)
    if c % 2 == 0: tr.add(t0 + .82, keys([m + 12 for m in chords[(c // 2) % 4]], 2.0, bright=.8), .32, pan=-.15)
# wrap the tail past 8 s back to the start so the loop is seamless
n = int(D * SR); x = tr.x
x[:x.shape[0] - n] += x[n:]
out = master(x[:n], 0)
sf.write(sys.argv[1], out, SR); print('ok')
