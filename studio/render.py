"""Frame-exact render of a scene page that defines seek(t), muxed with a WAV.
Usage: python3 render.py scene.html SECONDS audio.wav out.mp4   (1080x1920, 30 fps, H.264 + AAC, loudness -14 LUFS)"""
import sys, os, subprocess, shutil, pathlib
from playwright.sync_api import sync_playwright
page, secs, audio, out = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4]
FPS = 30
CHROME = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
d = pathlib.Path('/tmp/frames_' + pathlib.Path(page).stem); shutil.rmtree(d, ignore_errors=True); d.mkdir()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    pg.goto('file://' + os.path.abspath(page)); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(400)
    for i in range(round(secs * FPS)):
        pg.evaluate('t => seek(t)', i / FPS)
        pg.screenshot(path=str(d / f'{i:05d}.jpg'), type='jpeg', quality=92)
    b.close()
tmp = out[:-4] + '.part.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(d / '%05d.jpg'), '-i', audio,
                '-t', f'{secs:.3f}', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
                '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'aac', '-b:a', '192k',
                '-movflags', '+faststart', tmp], check=True)
os.replace(tmp, out)
print(out, round(os.path.getsize(out) / 1e6, 2), 'MB')
