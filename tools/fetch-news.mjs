// Fetches recent tiger-in-India headlines from public Google News RSS searches
// and writes data/news.json. Headline, source name, date and link only.
// If anything fails, the existing data/news.json is left untouched.
import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../data/news.json", import.meta.url);
const QUERIES = [
  "tiger India when:14d",
  "tiger reserve India when:14d",
  "Project Tiger NTCA when:30d",
];
const MUST = /\btigers?\b|\btigress\b/i;
const NOISE = /\b(IPL|cricket|Tiger Shroff|Tiger Woods|Tigers? (?:vs|beat|win)|Detroit Tigers|Leicester|Hull City|Tigers? Cricket)\b/i;
const MAX = 6;

const dec = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? dec(m[1]) : ""; };

async function one(q) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const r = await fetch(url, { headers: { "user-agent": "savethetiger-site-news/1.0" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${q}: HTTP ${r.status}`);
  const xml = await r.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const x = m[1];
    let title = tag(x, "title");
    let source = tag(x, "source");
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    const d = new Date(tag(x, "pubDate"));
    return { title, source, url: tag(x, "link"), date: isNaN(d) ? null : d.toISOString() };
  });
}

try {
  const all = (await Promise.all(QUERIES.map(one))).flat()
    .filter((i) => i.title && i.url && i.date && i.source && MUST.test(i.title) && !NOISE.test(i.title));
  const seen = new Set();
  const items = all.sort((a, b) => b.date.localeCompare(a.date)).filter((i) => {
    const k = i.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 60);
    if (seen.has(k)) return false; seen.add(k); return true;
  }).slice(0, MAX);
  if (!items.length) throw new Error("no items after filtering");
  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), items }, null, 2) + "\n");
  console.log(`news: ${items.length} items`);
} catch (e) {
  console.warn("news: fetch failed, keeping existing data/news.json:", e.message);
}
