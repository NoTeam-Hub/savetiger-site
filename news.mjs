import { readFile } from "node:fs/promises";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export async function loadNews(root) {
  let d = { items: [] };
  try { d = JSON.parse(await readFile(`${root}/data/news.json`, "utf8")); } catch {}
  const items = (d.items || []).filter((i) => i.title && i.url && i.date).slice(0, 6);
  const cards = items.map((i) => `<li><a class="news-card" href="${esc(i.url)}" target="_blank" rel="noopener nofollow"><span class="news-src">${esc(i.source)}</span><span class="news-title">${esc(i.title)}</span><time class="news-date" datetime="${esc(i.date.slice(0, 10))}">${fmt(i.date)}</time></a></li>`).join("");
  return { hasNews: items.length > 0, vars: { NEWS_CARDS: cards, NEWS_UPDATED: d.updated ? fmt(d.updated) : "" } };
}
