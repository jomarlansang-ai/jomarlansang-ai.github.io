#!/usr/bin/env python3
"""Downloads free-licensed Wikimedia Commons photos to assets/news/*.webp and writes CREDITS.md + images.json.
Run: python3 tools/fetch_images.py  (needs Pillow). Add entries to IMGS to add photos."""
import json,urllib.request,urllib.parse,re,io,os,html,time
from PIL import Image
UA={'User-Agent':'PlayTechCornerDraft/1.0 (playtechcorner@gmail.com)'}
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(ROOT,'assets/news')
IMGS=[
("phone-in-hand","File:Black smartphone in hand (Unsplash).jpg","A hand holding a black smartphone"),
("two-phones-table","File:Top view image of two smartphone on a wooden table, space for text, ready for mockup. Empty space. (47955056488).jpg","Two smartphones lying on a wooden table, seen from above"),
("laptop-desk","File:White work table with notes, smartphone and laptop (Unsplash).jpg","A white work desk with a laptop, a smartphone and notes"),
("laptop-typing","File:Typing on a laptop (Unsplash).jpg","Hands typing on a laptop keyboard"),
("phone-coffee","File:Hands-coffee-smartphone-technology (23698591814).jpg","Hands holding a smartphone next to a cup of coffee"),
("phone-browsing","File:Smartphone-mobile-hand-technology-internet-finger.jpg","A finger tapping a smartphone screen"),
("wireless-earbuds","File:ActiveSound wireless earbuds by Hykker (POJM200483).jpg","A pair of wireless earbuds with their charging case"),
("headphones-desk","File:Headphones on desk.jpg","Over-ear headphones resting on a desk"),
("game-controller","File:InclusiveGameLab 2-Xbox-Controller 1 CC-BY-SA.jpg","A video game controller"),
("gaming-headset","File:RGB gaming headset on desk with ambient lighting.jpg","A gaming headset on a desk under colourful ambient lighting"),
("mechanical-keyboard","File:Beautiful Mechanical Keyboard.jpg","A mechanical keyboard with colourful keycaps"),
("gaming-pcs","File:Gaming computers (1).jpg","Gaming computers with lit-up cases"),
("gas-station-cebu","File:RM Gas Station in Sibonga (2025-04-20).jpg","A roadside gas station in Sibonga, Cebu, Philippines"),
]
OK=('CC0','Public domain','CC BY','CC BY-SA')
def strip(s): return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>','',s))).strip()
def get(u): 
  for i in range(4):
    try: return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read()
    except Exception as e: time.sleep(3); err=e
  raise err
OVERRIDE_AUTHOR={'wireless-earbuds':'WrS.tm.pl'}
meta={};cred=["# Photo credits\n","All photos are from Wikimedia Commons under licenses that allow reuse (CC0, public domain, CC BY, CC BY-SA). They were downloaded, resized and converted to WebP by PlayTechCorner (a modification). A visible credit line appears under every image on the site. Photos are illustrative only and do not show any specific product discussed in a post. No press-kit, store-listing or review-site images are used.\n"]
for key,title,alt in IMGS:
  time.sleep(1.5)
  u='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(dict(action='query',format='json',titles=title,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1200))
  p=next(iter(json.loads(get(u))['query']['pages'].values()))
  if 'imageinfo' not in p: print('MISSING',title); continue
  ii=p['imageinfo'][0];m=ii['extmetadata']
  lic=m['LicenseShortName']['value'];assert lic.startswith(OK),(title,lic)
  licurl=m.get('LicenseUrl',{}).get('value','');raw=m.get('Artist',{}).get('value','Unknown author')
  art=strip(raw.split('<a rel="nofollow" class="external')[0]) or strip(raw)
  art=art.replace('Unknown authorUnknown author','Unknown author')
  art=OVERRIDE_AUTHOR.get(key,art)
  im=Image.open(io.BytesIO(get(ii['thumburl']))).convert('RGB'); im.thumbnail((1200,800))
  for q in (78,70,60,50):
    b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6)
    if b.tell()<190000:break
  open(f'{OUT}/{key}.webp','wb').write(b.getvalue())
  meta[key]=dict(alt=alt,w=im.width,h=im.height,author=art or 'Unknown author',license=lic,license_url=licurl,source=ii['descriptionurl'])
  cred.append(f"- **{key}.webp**: “{title[5:]}” by {art}. License: {lic}{' ('+licurl+')' if licurl else ''}. Source: {ii['descriptionurl']}")
  print(key,lic,im.size,b.tell(),'|',art)
open(f'{OUT}/CREDITS.md','w').write('\n'.join(cred)+'\n');old=json.load(open(f'{OUT}/images.json')) if os.path.exists(f'{OUT}/images.json') else {}
[meta[k].setdefault('pos',old[k]['pos']) for k in meta if 'pos' in old.get(k,{})]
json.dump(meta,open(f'{OUT}/images.json','w'),indent=1)
