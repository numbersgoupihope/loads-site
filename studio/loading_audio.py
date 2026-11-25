import sys, numpy as np, soundfile as sf
from synth import *
D = 8.0
tr = Track(D)

# ---- section A: slow, sleepy lo-fi (0 - 3.0), then a tape stop when the bar stalls ----
def section_a(length):
    a = np.zeros(int(length * SR)); bpm = 74; b = 60 / bpm
    chords = [[57, 60, 64, 67], [53, 57, 60, 64]]; roots = [45, 41]
    for k in range(int(length / (2 * b)) + 1):
        t0 = k * 2 * b; i = int(t0 * SR)
        def ad(sig, g):
            j = min(len(a), i + len(sig)); a[i:j] += sig[: j - i] * g if j > i else 0
        ad(keys(chords[k % 2], 2 * b + .4, bright=.6), .5)
        ad(bass(roots[k % 2], 2 * b), .55)
        ad(kick(), .35)
        i2 = int((t0 + b) * SR); s = clap(); j = min(len(a), i2 + len(s))
        if j > i2: a[i2:j] += lp(s, 2500)[: j - i2] * .18
        for h in range(4):
            i3 = int((t0 + h * b / 2 + (b / 2 * .12 if h % 2 else 0)) * SR); s = hat(); j = min(len(a), i3 + len(s))
            if j > i3: a[i3:j] += s[: j - i3] * .25
    return lp(a, 3200)
A = section_a(3.6)
A_stopped = tape_stop(A, 3.0, 0.42)
tr.add(0, A_stopped, .9)
tr.add(0, crackle(4.4), .9)

# ticks for each percent step 0 -> 12
def eout(x): return 1 - (1 - x) ** 3
prev = 0
for i in range(1, int(3.0 * 1000)):
    t = i / 1000; p = int(12 * eout(min(1, max(0, (t - .1) / 2.9))) + 1e-4)
    if p > prev: tr.add(t, tick(), .35, pan=.3); prev = p

# ---- Big Load arrives ----
tr.add(3.48, whoosh(.62), .55, pan=.4)
tr.add(4.1, thud(), .8)
tr.add(4.28, glint(), .6, pan=.2)

# ---- section B: the drop (4.45 - 7.3), 122 BPM house ----
bpm = 122; b = 60 / bpm; t0 = 4.45
chords = [[53, 57, 60, 64], [55, 59, 62, 64], [57, 60, 64, 67], [52, 55, 59, 64]]
roots = [41, 43, 45, 40]
B = Track(D)
nbeats = int((7.35 - t0) / b) + 1
for k in range(nbeats):
    t = t0 + k * b
    B.add(t, kick(), .95)
    if k % 2 == 1: B.add(t, clap(), .5)
    B.add(t + b / 2, hat(open_=True), .32, pan=.25)
    for s16 in range(4): B.add(t + s16 * b / 4, shaker(), .25 if s16 % 2 else .12, pan=-.3)
    c = (k // 2) % 4
    B.add(t + b / 2, bass(roots[c], b * .45), .7)
    B.add(t + b * .75, bass(roots[c] + 12, b * .2), .3)
    if k % 2 == 0: B.add(t + b / 2, keys([m + 12 for m in chords[c]], b * .9, bright=1.4), .5, pan=-.15)
# crash-ish burst on the drop
t = T(1.2); crash = hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 3.5)
B.add(t0, crash, .3)
fade = np.ones(B.n); i0, i1 = int(7.25 * SR), int(7.55 * SR); fade[i0:i1] = np.linspace(1, 0, i1 - i0); fade[i1:] = 0
B.x *= fade[:, None]
tr.x += B.x * .8

# clothes go in
for k in range(4): tr.add(4.77 + .1 * k, pop(1 + .12 * k), .55, pan=-.2 + .15 * k)
tr.add(4.48, riser(.58), .45)
for k, m in enumerate([84, 88, 91, 96]): tr.add(5.04 + k * .07, bell(m), .35, pan=-.3 + .2 * k)
tr.add(5.62, slurp(.48), .5, pan=.25)

# ---- loop back ----
tr.add(7.28, whoosh(.55, up=False), .5, pan=-.3)
back = A[: int(.5 * SR)] * np.linspace(0, 1, int(.5 * SR))
tr.add(7.5, back, .9)
tr.add(7.5, crackle(.5) * np.linspace(0, 1, int(.5 * SR)), .9)

out = master(tr.x, 0)
sf.write(sys.argv[1] if len(sys.argv) > 1 else '/tmp/loading.wav', out, SR)
print('ok', out.shape)
