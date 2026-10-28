// Build script for savethetiger.site
//   npm run build   ->  dist/   (minified, SEO-complete, ready to deploy anywhere static)
//
// What it does:
//   - validates config (HTTPS base URL, title <= 60 chars, description <= 160 chars)
//   - minifies CSS (inlined into <head>, no render-blocking request) and JS (hashed file name)
//   - injects the shared SEO head partial + JSON-LD structured data into each page
//   - generates sitemap.xml (last-modified dates come from git), robots.txt, _headers, manifest
//   - minifies HTML and runs sanity checks on the output

import { build, transform } from "esbuild";
import { minify as minifyHtml } from "html-minifier-terser";
import { cp, mkdir, readFile, readdir, rm, writeFile, stat } from "node:fs/promises";
import { execSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { schemaFor } from "./schema.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, "src");
const PUB = path.join(ROOT, "public");
const DIST = path.join(ROOT, "dist");

const fail = (msg) => {
  console.error(`\nBUILD FAILED: ${msg}\n`);
  process.exit(1);
};
const read = (p) => readFile(p, "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const today = new Date().toISOString().slice(0, 10);

// ---------- config (env vars override the file, handy for CI previews) ----------
const cfg = JSON.parse(await read(path.join(ROOT, "site.config.json")));
if (process.env.SITE_URL) cfg.siteUrl = process.env.SITE_URL;
if (process.env.GOATCOUNTER_CODE !== undefined) cfg.goatcounterCode = process.env.GOATCOUNTER_CODE;
cfg.siteUrl = cfg.siteUrl.replace(/\/+$/, "");

if (!/^https:\/\/[a-z0-9.-]+$/i.test(cfg.siteUrl)) fail(`siteUrl must look like https://example.com (got "${cfg.siteUrl}")`);
if (!/^[a-z0-9-]*$/.test(cfg.goatcounterCode)) fail("goatcounterCode may only contain a-z, 0-9 and hyphens");
for (const p of cfg.pages) {
  if (p.indexable) {
    if (p.title.length > 60) fail(`title too long (${p.title.length}/60): "${p.title}"`);
    if (p.description.length > 160) fail(`description too long (${p.description.length}/160) on ${p.path}`);
    if (p.description.length < 70) fail(`description too short (${p.description.length}) on ${p.path}`);
  }
}

// ---------- helpers ----------
function lastModified() {
  try {
    const d = execSync("git log -1 --format=%cs -- src", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
  } catch {
    return today;
  }
}
const lastmod = lastModified();

function cond(html, name, on) {
  const re = new RegExp(`<!--if:${name}-->([\\s\\S]*?)<!--endif:${name}-->`, "g");
  return html.replace(re, (_, inner) => (on ? inner : ""));
}
function fill(str, vars, label) {
  return str.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in vars)) fail(`unknown placeholder ${m} in ${label}`);
    return vars[key];
  });
}
const gc = cfg.goatcounterCode;
const gcHost = gc ? `https://${gc}.goatcounter.com` : "";
const csp = [
  "default-src 'self'",
  `script-src 'self'${gc ? " https://gc.zgo.at" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data:${gc ? " " + gcHost : ""}`,
  `connect-src 'self'${gc ? " " + gcHost : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

// ---------- start clean ----------
await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, "assets"), { recursive: true });

// ---------- CSS + JS ----------
const css = (await transform(await read(path.join(SRC, "styles.css")), { loader: "css", minify: true })).code.trim();
const js = await build({
  entryPoints: [path.join(SRC, "script.js")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019"],
  outdir: path.join(DIST, "assets"),
  entryNames: "app.[hash]",
  legalComments: "none",
  metafile: true,
});
const jsFile = Object.keys(js.metafile.outputs).map((p) => path.basename(p)).find((n) => n.endsWith(".js"));

// ---------- static assets ----------
await cp(path.join(SRC, "assets"), path.join(DIST, "assets"), { recursive: true });
await cp(path.join(SRC, "favicon.ico"), path.join(DIST, "favicon.ico"));

const siteVars = {
  SITE_URL: cfg.siteUrl,
  SITE_NAME: esc(cfg.siteName),
  THEME_COLOR: cfg.themeColor,
  CSP: csp,
};
for (const name of await readdir(PUB)) {
  const from = path.join(PUB, name);
  if (name.endsWith(".template") || ["robots.txt", "site.webmanifest"].includes(name)) {
    const out = name.replace(/\.template$/, "");
    await writeFile(path.join(DIST, out), fill(await read(from), siteVars, name));
  } else {
    await cp(from, path.join(DIST, name));
  }
}

// ---------- pages ----------
const headPartial = await read(path.join(SRC, "partials", "seo-head.html"));
const year = String(new Date().getFullYear());
const outputs = [];
for (const page of cfg.pages) {
  let html = await read(path.join(SRC, page.src));
  html = html.replace("<!--#include seo-head-->", () => headPartial).replace("<!--#inline-css-->", () => css);

  html = cond(html, "indexable", page.indexable);
  html = cond(html, "counter", !!gc);
  html = cond(html, "nocounter", !gc);

  const schema = schemaFor(page, cfg, { lastmod });
  const jsonld = schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : "";
  const canonical = `${cfg.siteUrl}${page.path}`;
  const vars = {
    ...siteVars,
    TITLE: esc(page.title),
    DESCRIPTION: esc(page.description),
    ROBOTS: page.indexable ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" : "noindex, nofollow",
    CANONICAL: canonical,
    LANG: cfg.lang,
    LOCALE: cfg.locale,
    OG_TYPE: page.ogType || "website",
    OG_TITLE: esc(page.ogTitle || page.title),
    OG_IMAGE: `${cfg.siteUrl}${cfg.ogImage}`,
    OG_IMAGE_ALT: esc(cfg.ogImageAlt),
    ASSET_BASE: page.assetBase ?? "",
    JS_FILE: jsFile,
    GC_CODE: gc,
    YEAR: year,
    JSONLD: "@@JSONLD@@",
  };
  html = fill(html, vars, page.src).split("@@JSONLD@@").join(jsonld);

  html = await minifyHtml(html, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    minifyCSS: false,
    minifyJS: false,
  });
  await writeFile(path.join(DIST, page.out), html);
  outputs.push({ page, file: page.out, html });
}

// ---------- sitemap.xml ----------
const urls = cfg.pages
  .filter((p) => p.indexable)
  .map((p) => `  <url>\n    <loc>${cfg.siteUrl}${p.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
  .join("\n");
const sitemapTpl = await read(path.join(SRC, "partials", "sitemap.template.xml"));
await writeFile(path.join(DIST, "sitemap.xml"), sitemapTpl.replace("{{URLS}}", () => urls));

// ---------- checks on the output ----------
const problems = [];
for (const { file, html, page } of outputs) {
  if (/\{\{|<!--if:|<!--endif:|<!--#/.test(html)) problems.push(`${file}: unresolved template markers`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) problems.push(`${file}: duplicate ids ${[...new Set(dup)].join(", ")}`);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (m[1] !== "top" && !ids.includes(m[1])) problems.push(`${file}: broken anchor #${m[1]}`);
  }
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${file}: missing <title>`);
  if (page.indexable) {
    for (const needle of ['rel="canonical"', 'property="og:title"', 'name="twitter:card"', "application/ld+json"]) {
      if (!html.includes(needle)) problems.push(`${file}: missing ${needle}`);
    }
  } else if (!html.includes("noindex")) problems.push(`${file}: should be noindex`);
  // asset references must exist in dist
  for (const m of html.matchAll(/(?:src|srcset|href)="([^"#?]+\.(?:png|webp|jpg|svg|ico|js|webmanifest))"/g)) {
    const ref = m[1].replace(/^\//, "");
    if (/^https?:/.test(m[1])) continue;
    try {
      await stat(path.join(DIST, ref));
    } catch {
      problems.push(`${file}: missing asset ${m[1]}`);
    }
  }
}
if (problems.length) fail(problems.join("\n  - "));

// ---------- report ----------
const size = async (p) => (await stat(path.join(DIST, p))).size;
console.log(`\nBuilt ${cfg.siteUrl}  (lastmod ${lastmod}, counter ${gc ? "on: " + gc : "off"})`);
for (const { file, html, page } of outputs) {
  const raw = Buffer.byteLength(html);
  console.log(`  ${file.padEnd(12)} ${String(raw).padStart(7)} B   gzip ${String(gzipSync(html).length).padStart(6)} B   title ${page.title.length}/60   desc ${page.description.length}/160`);
}
const jsRaw = await size(`assets/${jsFile}`);
console.log(`  ${jsFile.padEnd(20)} ${String(jsRaw).padStart(7)} B   gzip ${String(gzipSync(await readFile(path.join(DIST, "assets", jsFile))).length).padStart(6)} B`);
console.log(`  inline CSS           ${String(Buffer.byteLength(css)).padStart(7)} B   gzip ${String(gzipSync(css).length).padStart(6)} B\n`);
