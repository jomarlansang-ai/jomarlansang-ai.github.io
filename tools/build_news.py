#!/usr/bin/env python3
"""Builds /news/ (index, categories, posts), /news/feed.xml, sitemap.xml and the
homepage latest-news block from POSTS below. Run: python3 tools/build_news.py
Output is committed; GitHub Pages serves it as plain static files."""
import html, os, re, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://playtechcorner.com"
CATS = [
  ("apps", "Apps", "Updates on PlayTechCorner apps: PumpMap PH and Crazy Dragon."),
  ("tech", "Tech", "Tech explainers and notes for Filipino users."),
  ("gadgets", "Gadgets", "Budget buyer guides and comparisons for shoppers in the Philippines."),
  ("gaming", "Gaming", "Unofficial MIR4 notes and Crazy Dragon Control Center updates."),
]
CATNAME = {c[0]: c[1] for c in CATS}
TC = '<span class="to-confirm">to confirm</span>'
def PH(t): return f'<p class="placeholder"><strong>Placeholder:</strong> {t}</p>'

POSTS = [
 dict(slug="pumpmap-ph-1-0-8-live-on-google-play", cat="apps", date="2026-10-26",
  title="PumpMap PH 1.0.8 is live on Google Play",
  desc="PumpMap PH 1.0.8 is now public on Google Play: a free, ad-free map of gas stations and fuel prices in the Philippines that works offline.",
  body=f"""
<p>PumpMap PH version 1.0.8 is now publicly available on Google Play. It was published on Oct 26, 2026. The app is free and has no ads.</p>
<h2>What PumpMap PH does</h2>
<ul>
<li><strong>Google-confirmed gas stations</strong> shown on a map.</li>
<li><strong>Fuel price pins</strong> so you can see prices on the map.</li>
<li><strong>Offline price updates</strong>: you can update a price without signal and it syncs later.</li>
<li><strong>Report missing stations</strong> from the app.</li>
</ul>
<h2>New in 1.0.8</h2>
<p>From the PumpMap PH page: a first-launch tour that explains each button, an EV filter next to Diesel, an “Add station” tab for reporting a missing gas station or EV charger (an admin approves each report), map pins that group together when you zoom out, and a fix for a false “Offline” banner.</p>
<h2>What's next</h2>
<p>The PumpMap PH page lists weekly DOE fuel prices (planned, v2) and richer EV charger details (planned, v3). Release dates: {TC}.</p>
<p><a class="button" href="https://playtechcorner.com/pumpmap/get">Get PumpMap PH</a> <a class="button button-secondary" href="/pumpmap/">About PumpMap PH</a></p>
"""),
 dict(slug="crazy-dragon-app-features-and-1-0-7", cat="apps", date="2026-10-28",
  title="Crazy Dragon: what the MIR4 clan app does, and what's planned for 1.0.7",
  desc="A recap of Crazy Dragon, the free unofficial MIR4 clan manager by PlayTechCorner: donation and gold trackers, member lists, expeditions and reports.",
  body=f"""
<p>Crazy Dragon is an unofficial companion app for MIR4 players from PlayTechCorner. It is free on Google Play and contains ads. It is not affiliated with, endorsed by, or associated with Wemade.</p>
<h2>Features</h2>
<ul>
<li><strong>Daily donation tracker</strong>: see who has and has not donated today, and copy a report for Discord or Messenger.</li>
<li><strong>Gold donation tracker</strong>, kept separate from the daily list.</li>
<li><strong>Clan member management</strong> by name, class and role, with search and filters. Scanning members from a photo is available in the Android app.</li>
<li><strong>Expedition tracking</strong> with an expedition calculator.</li>
<li><strong>No member login</strong>: records stay on the device, or in the browser for the <a href="/app/">web app</a>.</li>
</ul>
<h2>Version 1.0.7</h2>
<p>The Crazy Dragon page describes features coming in version 1.0.7, including a “Today” view and a daily checklist. Version 1.0.7 is not confirmed live on Google Play. Release date: {TC}.</p>
<p><a class="button" href="https://play.google.com/store/apps/details?id=com.playtechcorner.crazydragon">Get Crazy Dragon</a> <a class="button button-secondary" href="/crazy-dragon/">About Crazy Dragon</a></p>
"""),
 dict(slug="crazy-dragon-control-center-mir4-companion", cat="gaming", date="2026-10-28",
  title="Crazy Dragon Control Center: an unofficial MIR4 companion in your browser",
  desc="Crazy Dragon Control Center is an unofficial MIR4 fan companion with today's bosses, a 53-boss schedule, a daily checklist and clan tools.",
  body=f"""
<p class="draft-note">Unofficial fan content. Not affiliated with Wemade. MIR4 is a trademark of Wemade.</p>
<p><a href="/mir4/">Crazy Dragon Control Center</a> is an unofficial companion for MIR4 players on PlayTechCorner. It runs in the browser and does not take accounts.</p>
<h2>What's inside</h2>
<ul>
<li>Today's bosses and a 53-boss schedule.</li>
<li>A daily checklist.</li>
<li>Character compare and an expedition calculator.</li>
<li>A clan board.</li>
</ul>
<h2>About the timers</h2>
<p>Boss timers are schedule estimates from a table checked 4 Oct 2026; boss presence is not tracked. A row is marked “spawning soon” 30 minutes before the scheduled time, and the live window is 10 minutes (5 minutes for Purgatory Quest Bosses).</p>
<h2>Your data</h2>
<p>Favorites, checklist ticks, clan records, expedition runs, planner notes and comparison entries stay in your browser. You can export or import them as JSON.</p>
<p><a class="button" href="/mir4/">Open Control Center</a></p>
"""),
 dict(slug="budget-phone-buying-guide-philippines-outline", cat="gadgets", date="2026-10-28",
  title="Budget phone buying guide for the Philippines (outline)",
  desc="Outline draft of a budget Android phone buying guide for shoppers in the Philippines. Prices and models still to be researched.",
  body=f"""
<p class="draft-note">Outline draft. Every model, price and spec below is a placeholder to research and confirm before publishing. No hands-on reviews yet.</p>
<h2>1. Who this guide is for</h2>
{PH("Budget bands in PHP (e.g. under ₱X, ₱X–₱Y). Amounts to confirm.")}
<h2>2. What to check before buying</h2>
<ul><li>Battery size and charging speed</li><li>Storage and RAM</li><li>Software update policy</li><li>Official PH warranty and service centers</li><li>Network bands for local carriers</li></ul>
<h2>3. Picks by price band</h2>
{PH("Model shortlist per band, with official PH prices and a link to each source.")}
<h2>4. Comparison table</h2>
{PH("Side-by-side specs table, filled in from official spec sheets.")}
<h2>5. Where to buy</h2>
{PH("Official stores and authorised resellers. Sources to confirm.")}
"""),
 dict(slug="offline-first-apps-philippines-outline", cat="tech", date="2026-10-28",
  title="Why offline-first apps matter in the Philippines (outline)",
  desc="Outline draft of a tech explainer on offline-first mobile apps and patchy mobile data, using PumpMap PH's offline price updates as an example.",
  body=f"""
<p class="draft-note">Outline draft. Coverage numbers and outside sources are placeholders until verified.</p>
<h2>1. The problem: patchy signal on the road</h2>
{PH("Cite a verifiable source on mobile coverage in the Philippines. Source to confirm.")}
<h2>2. What “offline-first” means</h2>
<p>An offline-first app saves your changes on the phone and syncs them once you are back online.</p>
<h2>3. Example: PumpMap PH</h2>
<p>PumpMap PH lets drivers update fuel prices offline; the updates sync later. <a href="/news/pumpmap-ph-1-0-8-live-on-google-play/">Read the 1.0.8 post</a>.</p>
<h2>4. Tips for users</h2>
{PH("Practical tips (offline maps, data saver settings). To write and check.")}
"""),
]
POSTS.sort(key=lambda p: (p["date"], p["title"]), reverse=True)

def esc(s): return html.escape(s, quote=True)
def fdate(d): return datetime.date.fromisoformat(d).strftime("%b %-d, %Y")

src = open(os.path.join(ROOT, "index.html")).read()
SIDEBAR = re.search(r'    <aside class="sidebar".*?</aside>\n', src, re.S).group(0)
SIDEBAR = SIDEBAR.replace(' aria-current="page"', '').replace('href="#my-apps"', 'href="/#my-apps"').replace('href="#testers"', 'href="/pumpmap/get"')
HEADER = re.search(r'      <header class="site-header">.*?</header>\n', src, re.S).group(0)
FOOTER = re.search(r'      <footer class="site-footer">.*?</footer>\n', src, re.S).group(0)
PROMO = '''      <aside class="promo-box" aria-label="Get our apps">
        <div class="promo-inner"><p class="promo-title">Get our apps</p>
          <div class="promo-app"><span class="promo-mark" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg></span>
            <div><strong>PumpMap PH</strong><span>Gas stations &amp; fuel prices. Free, no ads.</span></div>
            <a class="button" href="https://playtechcorner.com/pumpmap/get">Get PumpMap</a></div>
          <div class="promo-app"><img src="/assets/crazy-dragon-icon.webp" alt="" width="52" height="52">
            <div><strong>Crazy Dragon</strong><span>Unofficial MIR4 clan manager.</span></div>
            <a class="button" href="https://play.google.com/store/apps/details?id=com.playtechcorner.crazydragon">Google Play</a></div>
        </div>
      </aside>
'''

def page(path, title, desc, body, noindex=False, ogtype="website", current="/news/"):
    url = SITE + path
    sb = SIDEBAR.replace(f'<a href="{current}">', f'<a href="{current}" aria-current="page">', 1)
    robots = '\n  <meta name="robots" content="noindex, follow">' if noindex else ''
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">{robots}
  <link rel="canonical" href="{url}">
  <meta name="theme-color" content="#0a0e14">
  <meta property="og:type" content="{ogtype}">
  <meta property="og:site_name" content="PlayTechCorner">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}/assets/og.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(title)}">
  <meta name="twitter:description" content="{esc(desc)}">
  <meta name="twitter:image" content="{SITE}/assets/og.jpg">
  <link rel="alternate" type="application/rss+xml" title="PlayTechCorner News" href="/news/feed.xml">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/assets/favicon.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/theme.css">
  <script>document.documentElement.classList.add("js");</script>
  <script src="/js/site-config.js"></script>
  <noscript>
    <style>
      @media (max-width: 1023px) {{
        .nav-button {{ display: none !important; }}
        .shell {{ display: flex; flex-direction: column; }}
        .sidebar {{ display: flex !important; position: static !important; width: auto !important; height: auto !important; box-shadow: none !important; }}
      }}
    </style>
  </noscript>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <div class="shell">
{sb}    <div class="shell-main">
{HEADER}      <main id="main" tabindex="-1">
        <div class="wrap">
{body}
        </div>
      </main>
{PROMO}{FOOTER}    </div>
  </div>
  <script src="/js/nav.js"></script>
  <script src="/js/site.js"></script>
</body>
</html>
'''

def card(p, tag="h2"):
    u = f"/news/{p['slug']}/"
    return f'''<li class="news-card"><a class="kicker" href="/news/{p['cat']}/">{CATNAME[p['cat']]}</a>
  <{tag}><a href="{u}">{esc(p['title'])}</a> <span class="draft-badge">DRAFT</span></{tag}>
  <p>{esc(p['desc'])}</p><p class="news-meta"><time datetime="{p['date']}">{fdate(p['date'])}</time></p></li>'''

def tabs(cur):
    items = [('/news/', 'All')] + [(f'/news/{s}/', n) for s, n, _ in CATS]
    return '<ul class="cat-tabs">' + ''.join(f'<li><a href="{h}"{" aria-current=\"page\"" if h == cur else ""}>{n}</a></li>' for h, n in items) + '</ul>'

def write(rel, s):
    fp = os.path.join(ROOT, rel); os.makedirs(os.path.dirname(fp), exist_ok=True); open(fp, "w").write(s)

# news index
write("news/index.html", page("/news/", "Tech News — Apps, Gadgets, Gaming | PlayTechCorner",
  "PlayTechCorner news: PumpMap PH and Crazy Dragon app updates, tech explainers, budget gadget guides for the Philippines, and unofficial MIR4 notes.",
  f'''<section class="news-hero"><span class="kicker">PlayTechCorner</span><h1>News</h1>
<p>App updates, tech explainers, budget gadget guides for the Philippines, and unofficial MIR4 notes. <a href="/news/feed.xml">RSS feed</a></p>{tabs("/news/")}</section>
<ul class="news-list">{"".join(card(p) for p in POSTS)}</ul>'''))
for s, n, d in CATS:
    ps = [p for p in POSTS if p["cat"] == s]
    lst = "".join(card(p) for p in ps) or '<li class="news-card"><p>No posts yet.</p></li>'
    write(f"news/{s}/index.html", page(f"/news/{s}/", f"{n} News | PlayTechCorner", d,
      f'''<section class="news-hero"><a class="kicker" href="/news/">News</a><h1>{n}</h1><p>{esc(d)}</p>{tabs(f"/news/{s}/")}</section>
<ul class="news-list">{lst}</ul>'''))
for p in POSTS:
    write(f"news/{p['slug']}/index.html", page(f"/news/{p['slug']}/", f"[Draft] {p['title']} | PlayTechCorner", p["desc"],
      f'''<article class="article"><a class="kicker" href="/news/{p['cat']}/">{CATNAME[p['cat']]}</a> <span class="draft-badge">DRAFT</span>
<h1>{esc(p['title'])}</h1><p class="news-meta">By PlayTechCorner · <time datetime="{p['date']}">{fdate(p['date'])}</time></p>
{p['body'].strip()}
<p class="news-meta"><a href="/news/">← All news</a></p></article>''', noindex=True, ogtype="article"))

# RSS
def rfc(d): return datetime.datetime.fromisoformat(d + "T09:00:00+08:00").strftime("%a, %d %b %Y %H:%M:%S +0800")
items = "".join(f'''
    <item>
      <title>{esc("[DRAFT] " + p['title'])}</title>
      <link>{SITE}/news/{p['slug']}/</link>
      <guid isPermaLink="true">{SITE}/news/{p['slug']}/</guid>
      <pubDate>{rfc(p['date'])}</pubDate>
      <category>{CATNAME[p['cat']]}</category>
      <description>{esc(p['desc'])}</description>
    </item>''' for p in POSTS)
write("news/feed.xml", f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PlayTechCorner News</title>
    <link>{SITE}/news/</link>
    <atom:link href="{SITE}/news/feed.xml" rel="self" type="application/rss+xml"/>
    <description>App updates, tech, budget gadgets and unofficial MIR4 notes from PlayTechCorner.</description>
    <language>en-ph</language>
    <lastBuildDate>{rfc(POSTS[0]['date'])}</lastBuildDate>{items}
  </channel>
</rss>
''')

# sitemap: keep existing entries, add news index + categories (draft posts are noindex, so excluded)
sm = os.path.join(ROOT, "sitemap.xml"); s = open(sm).read()
s = re.sub(r'\n  <url>\n    <loc>https://playtechcorner.com/news/[^<]*</loc>.*?</url>', '', s, flags=re.S)
today = "2026-10-28"
add = "".join(f"\n  <url>\n    <loc>{SITE}{u}</loc>\n    <lastmod>{today}</lastmod>\n  </url>" for u in ["/news/"] + [f"/news/{c[0]}/" for c in CATS])
s = s.replace("\n</urlset>", add + "\n</urlset>"); open(sm, "w").write(s)

# homepage latest-news block
hp = os.path.join(ROOT, "index.html"); h = open(hp).read()
block = f'''<!-- NEWS:START (generated by tools/build_news.py) -->
        <section class="section reveal" id="latest-news" aria-labelledby="latest-news-h">
          <div class="wrap">
            <div class="section-head"><h2 id="latest-news-h">Latest news</h2><a href="/news/">All news →</a></div>
            <ul class="news-list">{"".join(card(p, "h3") for p in POSTS[:4])}</ul>
          </div>
        </section>
        <!-- NEWS:END -->'''
if "<!-- NEWS:START" in h:
    h = re.sub(r"<!-- NEWS:START.*?<!-- NEWS:END -->", lambda m: block, h, flags=re.S)
else:
    h = h.replace('        <section class="section" aria-label="Apps">', "        " + block + '\n\n        <section class="section" aria-label="Apps">', 1)
open(hp, "w").write(h)
print("built", len(POSTS), "posts")
