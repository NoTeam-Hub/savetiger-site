import { readFile } from "node:fs/promises";
import path from "node:path";
const fmt = (n) => Number(n).toLocaleString("en-IN");
const strip = (h) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export async function loadFaq(root) {
  const rd = async (f) => JSON.parse(await readFile(path.join(root, "data", f), "utf8"));
  const [faq, t, r] = await Promise.all([rd("faq.json"), rd("tigers.json"), rd("reserves.json")]);
  const L = t.years.length - 1, nat = t.nationalTotals;
  const top = Object.values(t.states).filter((s) => s.v[L] !== null).sort((a, b) => b.v[L] - a.v[L]).slice(0, 4);
  const vals = { TOTAL: fmt(nat[L]), FIRST: fmt(nat[0]), PCT: String(Math.round(((nat[L] - nat[0]) / nat[0]) * 100)), RESERVES: String(r.count), ASOF: new Date(r.asOf + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
  top.forEach((s, i) => { vals[`TOP${i + 1}`] = s.name; vals[`TOP${i + 1}N`] = fmt(s.v[L]); });
  const items = faq.map((f) => {
    const a = f.a.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in vals)) throw new Error(`faq: unknown ${m}`); return vals[k]; });
    return { q: f.q, a, text: strip(a) };
  });
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = items.map((i) => `<article class="faq-item"><h3>${esc(i.q)}</h3><p>${i.a}</p></article>`).join("");
  return { html, items };
}
