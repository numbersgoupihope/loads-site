"""Builds the search pages from index.html, i18n.js and config.js:
  - koreatown.html, downtown-la.html, van-nuys.html, sherman-oaks.html  (neighborhood pages)
  - es.html  (the homepage in Spanish, as its own page Google can index)
  - sitemap.xml
Run it again after changing prices, zips or homepage copy:  python3 tools/build_seo.py
Needs node and Playwright with Chrome (for es.html)."""
import json, os, re, subprocess, sys, datetime, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SITE = 'https://loadspickup.com'
TODAY = datetime.date.today().isoformat()

# ---------- settings from config.js ----------
C = json.loads(subprocess.check_output(['node', '-e',
    "global.window={};eval(require('fs').readFileSync('config.js','utf8'));process.stdout.write(JSON.stringify(window.LOADS_CONFIG))"]))
money = lambda v: ('%.2f' % v).rstrip('0').rstrip('.') if float(v) != int(v) else str(int(v))
PRICE, FEE, MIN = money(C['pricePerLb']), '%.2f' % C['deliveryFee'], money(C['minOrder'])
PHONE, SMS = C['phoneDisplay'], C['phoneSms']
STORES = {'Koreatown store': C['stores'][0], 'Van Nuys store': C['stores'][1]}
OFFER = "First load? Delivery's on us." if C.get('firstOrderOffer') else ''

src = open('index.html', encoding='utf-8').read()
STYLE = src[src.index('<style>'):src.index('</style>') + 8]
FONTS = re.search(r'<link rel="preconnect" href="https://fonts.googleapis.com">.*?rel="stylesheet">', src, re.S).group(0)
ICON = re.search(r'<link rel="icon"[^>]*>', src).group(0)
WORDMARK = re.search(r'<span class="wordmark">.*?<span class="sr-only">Loads</span></span>', src, re.S).group(0)

# ---------- the neighborhoods ----------
AREAS = [
  dict(slug='koreatown', name='Koreatown', store='Koreatown store',
       zips=['90004', '90005', '90006', '90010', '90019', '90020'],
       lead="Koreatown loads are washed at our laundromat right in the neighborhood, so your laundry never travels far.",
       local=["Most of Koreatown lives in apartment buildings, so tell us how to reach your door when you book: a gate code, a buzzer number, or \"leave it with the front desk.\" It goes in the pickup notes and your driver gets it.",
              "Working late or out all day? The last pickup window runs 9pm to midnight, every day of the week."],
       nearby="Mid-Wilshire, Wilshire Center and the blocks around Western, Vermont and Normandie"),
  dict(slug='downtown-la', name='Downtown LA', store='Koreatown store',
       zips=['90012', '90013', '90014', '90015', '90017', '90021', '90071'],
       lead="Downtown loads are washed at our laundromat in Koreatown, a short drive west.",
       local=["Lofts and high-rises are easy: leave your bag with the front desk or concierge, or add your building's entry instructions in the pickup notes.",
              "Pickups run from 9am to midnight, so you can hand off a bag before work or after a late night and have it back folded the next day."],
       nearby="the Arts District, Little Tokyo, the Historic Core, South Park, Bunker Hill and the Fashion District"),
  dict(slug='van-nuys', name='Van Nuys', store='Van Nuys store',
       zips=['91401', '91405', '91406', '91411'],
       lead="Van Nuys loads are washed at our laundromat right in Van Nuys, so your laundry stays close to home.",
       local=["House, apartment or gated complex, leave your bag by the door or tell us where to find it in the pickup notes. You don't need to be home.",
              "Big family loads are no problem. We charge by the pound, weighed dry before washing, and text you a photo of the scale with your total."],
       nearby="the neighborhoods around Van Nuys Blvd, Sepulveda and Sherman Way"),
  dict(slug='sherman-oaks', name='Sherman Oaks', store='Van Nuys store',
       zips=['91403', '91423'],
       lead="Sherman Oaks loads are washed at our laundromat in Van Nuys, a short drive away.",
       local=["Apartments along Ventura Blvd, houses in the hills or anywhere in between: leave your bag at your door or tell us where to find it when you book.",
              "Pick a two-hour window for pickup and another for drop-off, any time from 9am to midnight. We text you when the driver is on the way."],
       nearby="Ventura Blvd, the Sherman Oaks Galleria area and the hillside streets south of the boulevard"),
]
for a in AREAS:
    missing = [z for z in a['zips'] if z not in C['zones'][a['store']]]
    if missing: sys.exit(f"{a['name']}: zips {missing} aren't in config.js under {a['store']}")

def page(a):
    e = html.escape
    store_addr = STORES[a['store']]
    url = f"{SITE}/{a['slug']}"
    title = f"Laundry Pickup & Delivery in {a['name']} | Loads"
    desc = f"Laundry pickup and delivery in {a['name']}. Washed, dried and folded at our own laundromat, back {C['turnaround']}. ${PRICE} a pound, pickups 9am to midnight every day."
    others = [o for o in AREAS if o is not a]
    ld = [{"@context": "https://schema.org", "@type": "Service", "serviceType": "Laundry pickup and delivery", "name": f"Laundry pickup and delivery in {a['name']}",
           "provider": {"@id": f"{SITE}/#business"}, "areaServed": {"@type": "Place", "name": f"{a['name']}, Los Angeles, CA"}, "url": url,
           "offers": {"@type": "Offer", "priceCurrency": "USD", "price": str(C['pricePerLb']), "description": f"Wash, dry and fold, ${PRICE} per pound, ${MIN} minimum, ${FEE} each way for pickup and drop-off"}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Loads", "item": f"{SITE}/"},
              {"@type": "ListItem", "position": 2, "name": a['name'], "item": url}]}]
    faq = [("Do I need to be home?", "Nope. Leave your bag outside your door, or tell us where to find it in the pickup notes when you book."),
           ("When do I get it back?", f"Back {C['turnaround']}. You pick a two-hour window for pickup and another for drop-off, any time from 9am to midnight. We text you when the driver is on the way, with an arrival time."),
           ("How do you charge?", f"No card needed to book. We weigh your laundry dry at the store, before washing, and charge ${PRICE} a pound with a ${MIN} minimum, plus ${FEE} each way for pickup and drop-off. A full hamper usually comes in around 10 lbs. We text you the weight, a photo of the scale and your total."),
           ("Which laundromat washes my clothes?", f"Our laundromat in {a['store'].replace(' store', '')}. Your load is washed, dried and folded right there by our team, not sent out to someone else.")]
    if C.get('guarantee'): faq.append(("What if something comes back wrong?", C['guarantee']))
    zips = ' &middot; '.join(a['zips'])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/img/share.jpg">
<meta name="theme-color" content="#183a2e">
{ICON}
{FONTS}
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
{STYLE}
<style>
.hood-local{{display:flex;flex-wrap:wrap;gap:40px 64px;align-items:flex-start}}
.hood-local>div{{flex:1 1 420px;min-width:0}}
.hood-local p{{font-size:19px;margin:0 0 18px}}
.facts{{background:var(--base);border-radius:22px;padding:8px 28px;box-shadow:0 2px 4px rgba(24,58,46,.06),0 24px 50px rgba(24,58,46,.12)}}
.facts p{{display:flex;justify-content:space-between;gap:16px;margin:0;padding:16px 0;border-top:1px solid var(--line);font-size:16px}}
.facts p:first-child{{border-top:none}}
.facts span{{color:var(--muted)}}
.facts b{{text-align:right;font-weight:650}}
.zips{{margin:28px 0 0;font-size:17px}}
.steps3{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:24px;margin-top:44px}}
.hood-links a{{font-weight:600}}
</style>
</head>
<body>
{f'<div class="offer">{e(OFFER)} Laundry pickup all over LA and the Valley.</div>' if OFFER else ''}
<header class="wrap">
<nav class="nav" aria-label="Main">
<a href="/" class="logo">{WORDMARK}<small>Laundry pickup &amp; delivery</small></a>
<div class="nav-right">
<a class="link-btn" href="/es" lang="es">Español</a>
<span class="muted">Questions? Text <a href="sms:{SMS}">{PHONE}</a></span>
<a href="/#book" class="btn">Book a pickup</a>
</div>
</nav>
</header>

<main>
<section class="wrap">
<div class="hero-top">
<h1 class="display"><span class="h1-kw">Laundry pickup &amp; delivery in</span> {e(a['name'])}<span class="serif">.</span></h1>
<div class="hero-side">
<p class="kicker serif">Back {e(C['turnaround'])}.</p>
<p class="muted" style="margin:0 0 18px;font-size:19px">{e(a['lead'])} Pick a pickup window from 9am to midnight, leave your bag at your door, and it comes back washed, dried and folded.</p>
<div class="price"><b>${PRICE}</b><span class="muted">a pound, wash, dry and fold</span></div>
<p style="margin:22px 0 0"><a href="/#book" class="btn">Book a pickup</a></p>
</div>
</div>
</section>

<section class="tile sec">
<div class="wrap hood-local">
<div>
<h2 class="display h2" style="margin-bottom:28px">Picking up all over <span class="serif">{e(a['name'])}</span>.</h2>
{''.join(f'<p>{e(t)}</p>' for t in a['local'])}
<p class="muted">That covers {e(a['nearby'])}.</p>
<p class="zips"><b>Zip codes:</b> {zips}</p>
<p class="muted" style="font-size:16px">Not on the list? We cover about 30 miles around our laundromats in Koreatown and Van Nuys. <a href="/#book">Check your zip</a>.</p>
</div>
<div class="facts">
<p><span>Washed at</span><b>Our laundromat in {e(a['store'].replace(' store', ''))}</b></p>
<p><span>Pickup &amp; drop-off</span><b>9am to midnight, every day</b></p>
<p><span>Back</span><b>{e(C['turnaround']).capitalize()}</b></p>
<p><span>Wash, dry &amp; fold</span><b>${PRICE} a pound, ${MIN} minimum</b></p>
<p><span>Delivery fee</span><b>${FEE} each way{' (first delivery free)' if OFFER else ''}</b></p>
<p><span>Loads Weekly</span><b>${money(C['plan']['monthly'])} a month for {C['plan']['lbsPerWeek']} lb every week</b></p>
</div>
</div>
</section>

<section class="sec">
<div class="wrap">
<h2 class="display h2">How it <span class="serif">works</span>.</h2>
<div class="steps3">
<div class="card"><div class="card-body"><div class="num serif">1.</div><h3>Book in a minute</h3><p>Pick a pickup day and a two-hour window. No card needed to book.</p></div></div>
<div class="card"><div class="card-body"><div class="num serif">2.</div><h3>Leave your bag out</h3><p>We text you when the driver is on the way, with an arrival time.</p></div></div>
<div class="card"><div class="card-body"><div class="num serif">3.</div><h3>Back {e(C['turnaround'])}</h3><p>We weigh it dry, text you the scale photo and total, then wash, dry and fold it.</p></div></div>
</div>
</div>
</section>

<section class="wrap" style="padding-bottom:100px">
<div class="faq">
<h2 class="display" style="font-size:clamp(38px,4.6vw,60px);margin-bottom:28px">Questions?</h2>
{''.join(f'<details><summary>{e(q)}</summary><p>{e(ans)}</p></details>' for q, ans in faq)}
</div>
<p class="hood-links muted" style="text-align:center;margin:40px 0 0">We also pick up in {', '.join(f'<a href="/{o["slug"]}">{e(o["name"])}</a>' for o in others[:-1])} and <a href="/{others[-1]['slug']}">{e(others[-1]['name'])}</a>.</p>
</section>

<section class="final">
<div class="wrap">
<div><h2 class="display">Drop the <span class="serif">load</span>.</h2><p style="margin:0;font-size:19px;max-width:30em">Laundry pickup and delivery in {e(a['name'])}, ${PRICE} a pound.</p></div>
<a href="/#book" class="btn">Book a pickup</a>
</div>
</section>
</main>

<footer>
<div class="wrap">
<div>
<div style="flex:1 1 320px">{WORDMARK.replace('#183a2e', '#f3ede2')}
<p style="margin:14px 0 0;max-width:26em">Laundry pickup and delivery all over LA and the Valley, washed and folded at our own laundromats.</p></div>
<div><h3>Neighborhoods</h3>{''.join(f'<div style="margin-top:6px"><a href="/{o["slug"]}">{e(o["name"])}</a></div>' for o in AREAS)}</div>
<div><h3>Contact</h3><div><a href="sms:{SMS}">{PHONE}</a></div><div style="margin-top:6px">{e(C['email'])}</div><div style="margin-top:14px"><a href="/privacy.html">Privacy</a> &middot; <a href="/terms.html">Terms</a></div></div>
</div>
<p style="margin:36px 0 0;font-size:14px;color:#93a89b">&copy; {datetime.date.today().year} Loads Laundry Co. We do loads.</p>
</div>
</footer>
<div class="mbar"><div><b>${PRICE}/lb</b><small>{e(a['name'])}</small></div><a href="/#book" class="btn">Book a pickup</a></div>
</body>
</html>
"""

for a in AREAS:
    open(f"{a['slug']}.html", 'w', encoding='utf-8').write(page(a))
    print('wrote', a['slug'] + '.html')

# ---------- es.html: the homepage rendered in Spanish ----------
MAIN = '<script>\nconst CONFIG = window.LOADS_CONFIG;'
assert src.count(MAIN) == 1, 'main page script not found'
tmp = '_es_build.html'
open(tmp, 'w', encoding='utf-8').write(src.replace(MAIN, '<script type="text/x-hold">\nconst CONFIG = window.LOADS_CONFIG;'))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg = b.new_page()
    pg.route('**/*', lambda r: r.continue_() if (r.request.resource_type == 'document' or r.request.url.split('?')[0].endswith('/i18n.js')) else r.abort())
    pg.goto('file://' + os.path.join(ROOT, tmp) + '?lang=es')
    pg.wait_for_function("document.documentElement.lang === 'es'")
    out = '<!doctype html>\n' + pg.evaluate('document.documentElement.outerHTML')
    b.close()
os.remove(tmp)
out = out.replace('<script type="text/x-hold">', '<script>')
def sub(a_, b_):
    global out
    assert out.count(a_) == 1, a_; out = out.replace(a_, b_)
sub('<link rel="canonical" href="https://loadspickup.com/">', '<link rel="canonical" href="https://loadspickup.com/es">')
sub('<meta property="og:url" content="https://loadspickup.com/">', '<meta property="og:url" content="https://loadspickup.com/es">\n<meta property="og:locale" content="es_US">')
out = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Loads | Lavandería a domicilio en Los Ángeles">', out)
out = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="Deja tu bolsa en la puerta. Te la regresamos lavada, seca y doblada en nuestras propias lavanderías. $2.25 la libra.">', out)
out = re.sub(r'<script src="i18n\.js', "<script>window.LOADS_PAGE_LANG = 'es'; window.LOADS_ALT_URL = '/?lang=en';</script>\n<script src=\"i18n.js", out, count=1)
assert '<html lang="es"' in out
open('es.html', 'w', encoding='utf-8').write(out)
print('wrote es.html')

# ---------- sitemap ----------
urls = ['/', '/es'] + ['/' + a['slug'] for a in AREAS]
open('sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod></url>\n' for u in urls) + '</urlset>\n')
print('wrote sitemap.xml')
