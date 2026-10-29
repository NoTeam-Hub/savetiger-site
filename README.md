# SAVE THE TIGERS — savethetiger.site

A fast, static, SEO-complete site about tiger conservation in India. Plain semantic HTML, one small CSS file (inlined at build time) and one small JavaScript file. No framework, no runtime dependencies, no cookies.

## Why plain HTML instead of Next.js or Astro?

This is a single content page. A framework would add JavaScript and complexity for no benefit, and the plain build is already about 14 KB of HTML plus a 5 KB script after gzip. If the site grows to many pages (see "Phase 2" below), Astro is the natural upgrade because it keeps the same HTML-first output.

## Project layout

```
site.config.json        domain, titles, descriptions, counter code (edit this first)
maps.mjs                build-time SVG map generator (reads data/*.json)
data/                   tigers.json (census figures), reserves.json, india-map.json (outline + projection)
build.mjs               build: minify, SEO head, JSON-LD, sitemap, robots, headers
schema.mjs              Schema.org structured data
src/
  index.html            home page template
  404.html              not-found page (noindex)
  pages/                the four map pages (maps, reserves, population, landscapes)
  maps.js / maps.css    map interactions and styles (loaded on map pages only)
  styles.css            styles (inlined into <head> at build)
  script.js             counters, chart, stickers, share buttons, counter
  favicon.ico
  assets/               logo, icons, OG image, QR (WebP + PNG)
  partials/
    seo-head.html       reusable SEO head (title, canonical, robots, OG, Twitter, JSON-LD)
    header.html, footer.html, svg-defs.html, scripts.html, shell-top/bottom.html   shared page parts (<!--#include name-->)
    sitemap.template.xml
public/                 copied to the site root (robots.txt, CNAME, manifest, _headers.template)
tools/make-assets.py    regenerates icons, OG image and the optimised QR (needs Pillow)
.github/workflows/deploy.yml   build + deploy to GitHub Pages
dist/                   build output (generated, git-ignored)
```

## Commands

```bash
npm install        # once
npm run build      # creates dist/
npm start          # build and preview at http://localhost:4173
```

Needs Node 20 or newer. The build stops with a clear error if a title is over 60 characters, a description is over 160, a link target is missing, or a template marker is left unresolved.

## Configuration (site.config.json)

| Key | What it does |
|---|---|
| `siteUrl` | Base URL used for canonical, Open Graph, sitemap, robots and schema. Must be `https://…` with no trailing slash. |
| `goatcounterCode` | Turns on the small footer view counter (see below). Leave empty for no counter. |
| `pages[]` | One entry per page: path, title, description, `indexable`. Add a page here and it appears in the sitemap automatically. |

## SEO setup (what the build produces)

- Title (45/60 characters) and meta description (144/160) per page
- Canonical, `hreflang`, and robots meta (`index, follow, max-image-preview:large`); the 404 page is `noindex`
- Open Graph and Twitter Card tags with a 1200 × 630 share image
- Schema.org JSON-LD: Organization, WebSite, WebPage and Dataset (census figures)
- `sitemap.xml` generated at build time with `lastmod` taken from git history
- Strict `robots.txt`: allows everything useful (including CSS and JS), blocks `/404.html`, `/cdn-cgi/`, the payment QR image and query-string URLs, and points to the sitemap
- `_headers` with a Content-Security-Policy, HSTS, `nosniff`, a referrer policy, and long-term caching for the hashed JS file (used by Cloudflare Pages and Netlify; GitHub Pages ignores this file)
- Web app manifest and all icon sizes

The structured data deliberately uses `Organization`, not `NGO`: this is an independent awareness project, and marking it as a non-profit would be inaccurate. Change it only if you register one.

## Performance notes

- No web fonts, no images above the fold, no render-blocking requests (CSS is inlined)
- JavaScript is deferred, minified and content-hashed
- The QR image sits inside a collapsed section and loads lazily, as WebP with a PNG fallback
- The chart reserves its space (`aspect-ratio`) so nothing shifts when it draws
- Reduced-motion preferences are respected

## Visitor counter (optional, privacy-friendly)

The footer can show a tiny "N views" counter using [GoatCounter](https://www.goatcounter.com/). GoatCounter does not use cookies and does not track visitors with unique identifiers; the free service is meant for reasonable public use.

1. Create a free GoatCounter account and pick a code, for example `savethetiger` (your stats live at `savethetiger.goatcounter.com`).
2. In its settings, switch on **"Allow adding visitor counts on your website"** (it is off by default).
3. Put the code in `site.config.json` as `"goatcounterCode": "savethetiger"` and redeploy.

When a code is set, the build also adds the counter script, widens the Content-Security-Policy to allow it, and switches the Privacy Policy text to describe it. With no code, none of that appears. GoatCounter caches counts for up to four hours, so the number lags a little.

## Deploying (GitHub Pages, new repository)

1. **Unzip into a new folder that is not inside your old repository.** Run `git status` there; it should say "not a git repository". That keeps the two projects apart.
2. `npm install`, then `npm run build` to confirm it works.
3. Create a new, **empty** repository on GitHub (no README, licence or .gitignore), for example `savetiger-site`. It must be public for free GitHub Pages.
4. In the project folder:
   ```bash
   git init -b main
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<your-username>/savetiger-site.git
   git push -u origin main
   ```
5. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`. Check the Actions tab for a green run.
6. **Verify the domain first** (Settings → Pages → Add a domain, or your account's Pages settings), then set **Custom domain** to `savethetiger.site`.
7. At your domain registrar, add DNS records for the apex domain and `www`:
   - `A` for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` for `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` (optional, keep the A records too)
   - `CNAME` for `www` → `<your-username>.github.io` (no repository name)
   - Remove any old parking or conflicting records. DNS can take up to 24 hours.
8. When the option appears, tick **Enforce HTTPS**.
9. Leave the old repository alone, or archive it (Settings → Danger Zone → Archive). Two repositories cannot serve the same custom domain, so remove the domain from the old one if it was ever set.

Alternative with better security headers: connect the same GitHub repository to **Cloudflare Pages** (build command `npm run build`, output directory `dist`, environment variable `NODE_VERSION=22`). It applies `_headers` (CSP, HSTS, caching), which GitHub Pages cannot.

## After launch

1. Add `https://savethetiger.site` to Google Search Console (a Domain property verified by DNS TXT is best), submit `https://savethetiger.site/sitemap.xml`, and use URL Inspection to request indexing of the home page.
2. Do the same in Bing Webmaster Tools (it can import from Search Console).
3. Test the share preview with the platforms' own debuggers, and run [PageSpeed Insights](https://pagespeed.web.dev/) on mobile and desktop.
4. If the old `savethetiger.vercel.app` site is still up anywhere, set a permanent (301) redirect from it to the new domain, or take it down.

## Maps

Four pages are generated at build time from `data/`: `/maps/` (hub with a decorative paw trail), `/tiger-reserves-india/`, `/tiger-population-by-state/` and `/tiger-landscapes-india/`. They are inline SVG (no map library, no tiles) and the tables carry the same data, so they work without JavaScript.

- Update census numbers in `data/tigers.json`; reserves in `data/reserves.json` (`displayLat/displayLon` nudge a dot into its own state).
- State outlines come from `data/india-map.json` (MapSVG via @svg-maps/india, CC BY 4.0, credited in the footer). The outline matches India's boundary as claimed by the Government of India (all of Jammu & Kashmir and Ladakh, including Gilgit-Baltistan and Aksai Chin). It was checked against DataMeet's CC0 `india-composite.geojson`, which is built to the same claim. It is simplified, so it is not a legal survey reference. `tools/calibrate-map.mjs --mercator --write` re-fits the projection if you swap the shapes.
- Exact tiger or pugmark locations are deliberately not shown (poaching risk).

## Phase 2: structure for better search visibility

One page can only rank for a few searches. When you have time to write real content, split the sections into their own pages with clean URLs, add each to `pages[]` in `site.config.json`, and the sitemap, canonical and schema follow automatically:

- `/tiger-population-india/` (census data, state tables)
- `/threats-to-tigers/` (habitat loss, poaching, conflict)
- `/how-to-help-tigers/` (donate, report, travel responsibly)

Write original text of at least a few hundred words on each; thin pages do not help.

## Lighthouse

Run it from Chrome DevTools or PageSpeed Insights on the deployed site. This project is built to score at or near 100, but a perfect score is not guaranteed on every run or host. Hosts that cannot set cache and security headers (including GitHub Pages) can cost a few points, and a third-party counter script adds a small amount of work.
