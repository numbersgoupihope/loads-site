"""Screenshot a scene at given times to check layout before a full render.
Usage: python3 still.py scene.html W H out_prefix t1 t2 ...   (writes out_prefix_<t>.png)"""
import sys, os
from playwright.sync_api import sync_playwright
page, W, H, pre = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
ts = [float(x) for x in sys.argv[5:]] or [0]
CHROME = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
    pg = b.new_page(viewport={'width': W, 'height': H})
    pg.goto('file://' + os.path.abspath(page)); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
    for t in ts:
        pg.evaluate('t => { if (window.seek) seek(t); }', t)
        out = f'{pre}_{t:05.2f}.png' if len(ts) > 1 else f'{pre}.png'
        pg.screenshot(path=out); print(out)
    b.close()
