# PlayTechCorner

Static site for [playtechcorner.com](https://playtechcorner.com/).

GitHub Pages is configured as a legacy build from `main`. This site is plain HTML and CSS. The `.nojekyll` file tells Pages to copy the files as they are, which avoids the Jekyll failure caused by a file named `assets` (Jekyll error: `Is a directory @ apply2files - /github/workspace/_site/assets`).

The privacy policy stays in the separate repository and is linked at [playtechcorner.com/playtechcorner-privacy/privacy-policy.html](https://playtechcorner.com/playtechcorner-privacy/privacy-policy.html). Do not add a `playtechcorner-privacy/` path here.

`app-ads.txt` and `CNAME` are required for the live site. Leave them unchanged.

## Google Search Console

In `index.html`, find the commented `google-site-verification` meta tag. Paste the HTML-tag token from Search Console into `content`, then uncomment the tag.

## Cloudflare Web Analytics

In `js/site-config.js`, set `CF_ANALYTICS_TOKEN` to the site token from Cloudflare Web Analytics. An empty string loads no beacon and makes no request to Cloudflare.

## Feedback

In `js/site-config.js`, set `FEEDBACK_ENDPOINT` to a Formspree form URL (`https://formspree.io/f/…`). An empty string keeps the `/mir4/` feedback form on a pre-filled email to playtechcorner@gmail.com.
