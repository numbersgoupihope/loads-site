import sys, numpy as np, soundfile as sf
from synth import *
D = 12.0
tr = Track(D)
ITEMS = [2.8, 4.1, 5.4, 6.7]; PAY = 8.1
# ---- groove: 124 BPM, bright ----
bpm = 124; b = 60 / bpm
chords = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]]
roots = [48, 43, 45, 41]
M = Track(D)
for k in range(int(D / b) + 1):
    t = k * b; c = (k // 4) % 4
    if t < 1.55: 
        M.add(t, hat(), .15, pan=.3)       # just hats while counting
        continue
    M.add(t, kick(), .8)
    if k % 2 == 1: M.add(t, clap(), .4)
    M.add(t + b / 2, hat(open_=True), .22, pan=.3)
    M.add(t + b / 2, bass(roots[c], b * .45), .6)
    if k % 4 == 0: M.add(t, keys([m + 12 for m in chords[c]], b * 3.8, bright=1.2), .38, pan=-.15)
fade = np.ones(M.n); i0 = int((D - 1.0) * SR); fade[i0:] = np.linspace(1, 0, M.n - i0)
M.x *= fade[:, None]
tr.x += M.x * .6
# count-up ticks (ease-out: fast then slowing)
def eout(x): return 1 - (1 - x) ** 3
prev = 0
for i in range(1, 1600):
    t = i / 1000; n = round(62 * eout(min(1, max(0, (t - .05) / 1.5))))
    if n != prev and (n - prev) >= 1:
        if n % 2 == 0 or n > 50: tr.add(t, tick(), .3, pan=.2)
        prev = n
t = T(1.2); boom = np.sin(2*np.pi*np.cumsum(40 + 80*np.exp(-t*12))/SR) * np.exp(-t * 4)
tr.add(1.55, boom, .8); tr.add(1.55, bell(91, 1.4), .45); tr.add(1.58, bell(96, 1.2), .3)
t = T(1.0); tr.add(1.55, hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 4), .25)
# item hits
for a in ITEMS: tr.add(a - .15, whoosh(.3), .3, pan=-.3); tr.add(a + .05, pop(1.0), .4)
for k in range(9): tr.add(ITEMS[0] + .15 + k * .07 + (k % 3) * .02, pop(1.6 + (k % 4) * .3), .3, pan=(k % 5 - 2) * .25)   # popcorn
def clink():
    t = T(.8); return (np.sin(2*np.pi*2900*t) + .7*np.sin(2*np.pi*4300*t) + .4*np.sin(2*np.pi*6100*t)) * np.exp(-t * 7) * .35
tr.add(ITEMS[1] + .2, clink(), .6); tr.add(ITEMS[1] + .32, clink(), .4, pan=.3)
t = T(1.1); jet = lp(rng.standard_normal(len(t)), 2500) * np.sin(np.pi * t / 1.1) ** 2
tr.add(ITEMS[2] + .05, jet, .45, pan=-.4)
def blip(m): t = T(.12); return np.sin(2*np.pi*hz(m)*t) * env(len(t), .003, .06) * .5
for k, m in enumerate((84, 88, 84, 91, 88)): tr.add(ITEMS[3] + .15 + k * .11, blip(m), .4, pan=.2)
# payoff
tr.add(PAY + .3, whoosh(.5), .45, pan=.3)
tr.add(PAY + .9, thud(), .75)
tr.add(PAY + 1.1, glint(), .5, pan=.2)
tr.add(PAY + 1.4, pop(1.1), .5)
for k, m in enumerate((84, 88, 91, 96)): tr.add(PAY + 1.42 + k * .07, bell(m), .3, pan=-.3 + .2 * k)
tr.add(PAY + 2.0, slurp(.5), .45, pan=.25)
out = master(tr.x, 0); sf.write(sys.argv[1], out, SR); print('ok')
