# Adding a news post

Posts live in `tools/posts/`, one file per post. The file name is the URL slug:
`tools/posts/my-post-slug.html` becomes `https://playtechcorner.com/news/my-post-slug/`.
Use lowercase letters, numbers and hyphens only.

## File format

```
---
title: Short headline, sentence case
date: 2026-10-28
category: gadgets
summary: One or two sentences (about 150 characters). Used for the card, meta description and RSS.
image: two-phones-table
author: Writer Name
draft: true
sources:
  - Source name | https://example.com/page
  - Another source | https://example.org/page
---
<p>Body in plain HTML: &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;/&lt;li&gt;, &lt;a&gt;, &lt;strong&gt;.</p>
<h2>Section heading</h2>
<p>More text.</p>
```

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Headline. |
| `date` | yes | `YYYY-MM-DD`. Newest posts appear first. |
| `category` | yes | One of `apps`, `tech`, `gadgets`, `gaming`. |
| `summary` | yes | Plain text, no HTML. |
| `image` | yes | A key from `assets/news/images.json` (file `assets/news/<key>.webp`). Optional `pos` in images.json sets the crop focus, e.g. `"50% 88%"`. |
| `author` | no | Defaults to `PlayTechCorner`. |
| `draft` | no | Defaults to `true`: shows a DRAFT badge, adds `noindex`, keeps it out of `sitemap.xml`. Set `false` only after review. |
| `sources` | no | One `  - Label | URL` line each. They render as a numbered **Sources** list at the end of the post. If none, a "sources to be added" placeholder is shown. |

Body helpers: `<span class="to-confirm">to confirm</span>` for unverified details, and
`<p class="placeholder"><strong>Placeholder:</strong> ...</p>` for sections still to write.

## Rules

- Facts must be verifiable; link every outside fact in `sources`. No invented stats, reviews or quotes.
- MIR4 content is unofficial: no crypto, XDRACO or NFT wording, no Wemade art.
- Never include AdMob IDs, admin URLs, server details or tester emails.

## Images

Allowed: free-licensed photos (Unsplash, Pexels, Wikimedia Commons), official press or media-kit
images only when the kit's terms allow editorial use (record the terms in `assets/news/CREDITS.md`),
or Joms's own photos. Never use images from Shopee or Lazada listings, other review sites or Google Images.
Don't caption a generic photo as a specific product.

To add a Wikimedia Commons photo, add a line to `IMGS` in `tools/fetch_images.py` (key, exact `File:` title, alt text)
and run `python3 tools/fetch_images.py` (needs Pillow). It saves a WebP under 200 KB, and updates `images.json`
and `CREDITS.md`. For other sources, add the WebP and a matching `images.json` entry (alt, w, h, author, license,
license_url, source) and a CREDITS.md line by hand. Every image gets a visible credit line automatically.

## Build

```
python3 tools/build_news.py
```

This regenerates `/news/` (index, category pages, posts, newsletter), `/news/feed.xml`, the news
entries in `sitemap.xml`, and the homepage "Latest news" block. Commit the output.
