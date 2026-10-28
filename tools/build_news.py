#!/usr/bin/env python3
"""Builds /news/ (index, categories, posts), /news/feed.xml, sitemap.xml and the
homepage latest-news block from POSTS below. Run: python3 tools/build_news.py
Output is committed; GitHub Pages serves it as plain static files."""
import html, os, re, datetime
def esc(s): return html.escape(s, quote=True)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://playtechcorner.com"
CATS = [
  ("apps", "Apps", "Updates on PlayTechCorner apps: PumpMap PH and Crazy Dragon."),
  ("tech", "Tech", "Tech explainers and notes for Filipino users."),
  ("gadgets", "Gadgets", "Budget buyer guides and comparisons for shoppers in the Philippines."),
  ("gaming", "Gaming", "Unofficial MIR4 notes and Crazy Dragon Control Center updates."),
]
CATNAME = {c[0]: c[1] for c in CATS}
import json
IMG = json.load(open(os.path.join(ROOT, "assets/news/images.json")))
CAT_IMG = {"apps": "phone-browsing", "tech": "laptop-typing", "gadgets": "two-phones-table", "gaming": "game-controller"}
REQUIRED = ("title", "date", "category", "summary", "image")

def load_post(fp):
    raw = open(fp, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n(.*)", raw, re.S)
    if not m: raise SystemExit(f"{fp}: missing --- front matter")
    meta, cur = {"sources": []}, None
    for line in m.group(1).splitlines():
        if re.match(r"\s+- ", line) and cur == "sources":
            label, _, url = line.strip()[2:].partition("|")
            meta["sources"].append((label.strip(), url.strip()))
        elif ":" in line:
            k, _, v = line.partition(":"); cur = k.strip(); v = v.strip()
            if cur != "sources": meta[cur] = v
    for k in REQUIRED:
        if not meta.get(k): raise SystemExit(f"{fp}: missing '{k}'")
    if meta["category"] not in CATNAME: raise SystemExit(f"{fp}: unknown category {meta['category']}")
    if meta["image"] not in IMG: raise SystemExit(f"{fp}: image '{meta['image']}' not in assets/news/images.json")
    datetime.date.fromisoformat(meta["date"])
    return dict(slug=os.path.basename(fp)[:-5], cat=meta["category"], date=meta["date"], title=meta["title"],
                desc=meta["summary"], image=meta["image"], author=meta.get("author", "PlayTechCorner"),
                draft=meta.get("draft", "true").lower() != "false", sources=meta["sources"], body=m.group(2))

POSTS = [load_post(os.path.join(ROOT, "tools/posts", f)) for f in sorted(os.listdir(os.path.join(ROOT, "tools/posts"))) if f.endswith(".html")]

def credit(key):
    i = IMG[key]
    return (f'Photo: {esc(i["author"])} / <a href="{esc(i["source"])}">Wikimedia Commons</a>, '
            + (f'<a href="{esc(i["license_url"])}">{esc(i["license"])}</a>' if i.get("license_url") else esc(i["license"])))

def figure(key, cls="", eager=False, sizes="100vw"):
    i = IMG[key]
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    return (f'<figure class="photo {cls}"><img src="/assets/news/{key}.webp" alt="{esc(i["alt"])}"{(' style="object-position:' + i["pos"] + '"') if i.get("pos") else ""} width="{i["w"]}" height="{i["h"]}" {load}>'
            f'<figcaption class="photo-credit">{credit(key)}</figcaption></figure>')

POSTS.sort(key=lambda p: (p["date"], p["title"]), reverse=True)

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

def page(path, title, desc, body, noindex=False, ogtype="website", current="/news/", ogimage=SITE + "/assets/og.jpg"):
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
  <meta property="og:image" content="{ogimage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(title)}">
  <meta name="twitter:description" content="{esc(desc)}">
  <meta name="twitter:image" content="{ogimage}">
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

NL_BLOCK = '''<section class="newsletter-box"><div><span class="kicker">Newsletter</span><h2>A weekly tech news roundup is coming</h2>
<p>App updates, budget gadgets and gaming notes for the Philippines, once a week. No signup form yet.</p></div>
<p><a class="button" href="/news/newsletter/">Learn more</a> <a class="button button-secondary" href="mailto:playtechcorner@gmail.com?subject=Newsletter%20signup">Email us</a></p></section>'''
GALLERY = ["wireless-earbuds", "headphones-desk", "mechanical-keyboard", "gaming-headset", "gaming-pcs", "laptop-typing"]

def card(p, tag="h2"):
    u = f"/news/{p['slug']}/"
    badge = ' <span class="draft-badge">DRAFT</span>' if p["draft"] else ""
    return f'''<li class="news-card">{figure(p["image"], "thumb")}<a class="kicker" href="/news/{p['cat']}/">{CATNAME[p['cat']]}</a>
  <{tag}><a href="{u}">{esc(p['title'])}</a>{badge}</{tag}>
  <p>{esc(p['desc'])}</p><p class="news-meta"><time datetime="{p['date']}">{fdate(p['date'])}</time></p></li>'''

def tabs(cur):
    items = [('/news/', 'All')] + [(f'/news/{s}/', n) for s, n, _ in CATS]
    return '<ul class="cat-tabs">' + ''.join(f'<li><a href="{h}"{" aria-current=\"page\"" if h == cur else ""}>{n}</a></li>' for h, n in items) + '</ul>'

def write(rel, s):
    fp = os.path.join(ROOT, rel); os.makedirs(os.path.dirname(fp), exist_ok=True); open(fp, "w").write(s)

# news index
write("news/index.html", page("/news/", "Tech News — Apps, Gadgets, Gaming | PlayTechCorner",
  "PlayTechCorner news: PumpMap PH and Crazy Dragon app updates, tech explainers, budget gadget guides for the Philippines, and unofficial MIR4 notes.",
  f'''<section class="news-hero">{figure("laptop-desk", "hero", eager=True)}<span class="kicker">PlayTechCorner</span><h1>News</h1>
<p>App updates, tech explainers, budget gadget guides for the Philippines, and unofficial MIR4 notes. <a href="/news/feed.xml">RSS feed</a></p>{tabs("/news/")}</section>
<ul class="news-list">{"".join(card(p) for p in POSTS)}</ul>
{NL_BLOCK}'''))
for s, n, d in CATS:
    ps = [p for p in POSTS if p["cat"] == s]
    lst = "".join(card(p) for p in ps) or '<li class="news-card"><p>No posts yet.</p></li>'
    write(f"news/{s}/index.html", page(f"/news/{s}/", f"{n} News | PlayTechCorner", d,
      f'''<section class="news-hero">{figure(CAT_IMG[s], "hero", eager=True)}<a class="kicker" href="/news/">News</a><h1>{n}</h1><p>{esc(d)}</p>{tabs(f"/news/{s}/")}</section>
<ul class="news-list">{lst}</ul>'''))
def sources_html(p):
    if not p["sources"]:
        return '<section class="sources"><h2>Sources</h2><p class="placeholder"><strong>Placeholder:</strong> sources to be added before publishing.</p></section>'
    li = "".join(f'<li><a href="{esc(u)}">{esc(l)}</a></li>' if u else f"<li>{esc(l)}</li>" for l, u in p["sources"])
    return f'<section class="sources"><h2>Sources</h2><ol>{li}</ol></section>'

for p in POSTS:
    badge = ' <span class="draft-badge">DRAFT</span>' if p["draft"] else ""
    write(f"news/{p['slug']}/index.html", page(f"/news/{p['slug']}/", ("[Draft] " if p["draft"] else "") + f"{p['title']} | PlayTechCorner", p["desc"],
      f'''<article class="article"><a class="kicker" href="/news/{p['cat']}/">{CATNAME[p['cat']]}</a>{badge}
<h1>{esc(p['title'])}</h1><p class="news-meta">By {esc(p['author'])} · <time datetime="{p['date']}">{fdate(p['date'])}</time></p>
{figure(p["image"], "hero", eager=True)}
{p['body'].strip()}
{sources_html(p)}
<p class="news-meta"><a href="/news/">← All news</a></p></article>''', noindex=p["draft"], ogtype="article", ogimage=f"{SITE}/assets/news/{p['image']}.webp"))

write("news/newsletter/index.html", page("/news/newsletter/", "Newsletter: weekly tech news roundup (coming soon) | PlayTechCorner",
  "A weekly PlayTechCorner tech news roundup for the Philippines is coming soon: app updates, gadgets and gaming news.",
  f'''<section class="news-hero">{figure("phone-coffee", "hero", eager=True)}<a class="kicker" href="/news/">News</a><h1>Newsletter</h1>
<p>A weekly tech news roundup is coming soon.</p></section>
<article class="article">
<p>Each week we plan to send a short roundup of tech news for the Philippines: PlayTechCorner app updates (PumpMap PH and Crazy Dragon), budget gadget picks, and gaming notes.</p>
<p>There is no signup form yet. If you want the first issue, email us and we'll add you by hand when it launches.</p>
<p><a class="button" href="mailto:playtechcorner@gmail.com?subject=Newsletter%20signup">Email playtechcorner@gmail.com</a></p>
<p class="news-meta">Launch date: <span class="to-confirm">to confirm</span>. Until then, follow the <a href="/news/feed.xml">RSS feed</a>.</p>
</article>'''))

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
add = "".join(f"\n  <url>\n    <loc>{SITE}{u}</loc>\n    <lastmod>{today}</lastmod>\n  </url>" for u in ["/news/", "/news/newsletter/"] + [f"/news/{c[0]}/" for c in CATS] + [f"/news/{p['slug']}/" for p in POSTS if not p["draft"]])
s = s.replace("\n</urlset>", add + "\n</urlset>"); open(sm, "w").write(s)

# homepage latest-news block
hp = os.path.join(ROOT, "index.html"); h = open(hp).read()
block = f'''<!-- NEWS:START (generated by tools/build_news.py) -->
        <section class="section reveal" id="latest-news" aria-labelledby="latest-news-h">
          <div class="wrap">
            <div class="section-head"><h2 id="latest-news-h">Latest news</h2><a href="/news/">All news →</a></div>
            <ul class="news-list">{"".join(card(p, "h3") for p in POSTS[:4])}</ul>
            <div class="section-head"><h2>Gadgets, gear and gaming</h2><a href="/news/gadgets/">Gadget guides →</a></div>
            <div class="gallery">{"".join(figure(k, "tile") for k in GALLERY)}</div>
            {NL_BLOCK}
          </div>
        </section>
        <!-- NEWS:END -->'''
if "<!-- NEWS:START" in h:
    h = re.sub(r"<!-- NEWS:START.*?<!-- NEWS:END -->", lambda m: block, h, flags=re.S)
else:
    h = h.replace('        <section class="section" aria-label="Apps">', "        " + block + '\n\n        <section class="section" aria-label="Apps">', 1)
open(hp, "w").write(h)
print("built", len(POSTS), "posts")
