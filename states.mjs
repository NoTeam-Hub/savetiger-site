// Generates one page per state from data/tigers.json + data/reserves.json (build time, static HTML).
import { readFile } from "node:fs/promises";
import path from "node:path";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => Number(n).toLocaleString("en-IN");
export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const statePath = (name) => `/tiger-population-by-state/${slugify(name)}/`;
const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const sgn = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));

export async function buildStatePages(root, stateMap) {
  const rd = async (f) => JSON.parse(await readFile(path.join(root, "data", f), "utf8"));
  const [tigers, resFile] = await Promise.all([rd("tigers.json"), rd("reserves.json")]);
  const years = tigers.years, L = years.length - 1, nat = tigers.nationalTotals;
  const entries = Object.entries(tigers.states).map(([id, s]) => ({ id, ...s })).sort((a, b) => a.name.localeCompare(b.name));
  const withLast = entries.filter((s) => s.v[L] !== null);
  const pages = [];

  entries.forEach((s, i) => {
    const v = s.v, last = v[L], prev = v[L - 1];
    const firstIdx = v.findIndex((n) => n !== null);
    const higher = withLast.filter((o) => o.v[L] > last).length;
    const tied = withLast.filter((o) => o.id !== s.id && o.v[L] === last).length > 0;
    const rank = higher + 1;
    const peak = Math.max(...v.filter((n) => n !== null));
    const peakYear = years[v.indexOf(peak)];

    // ----- lede -----
    let lede;
    if (last === 0) {
      lede = `The ${years[L]} All India Tiger Estimation recorded no tigers in ${esc(s.name)}.`;
      if (v[0]) lede += ` The first estimate, in ${years[0]}, reported ${fmt(v[0])}.`;
    } else {
      lede = `The ${years[L]} All India Tiger Estimation put ${esc(s.name)}'s tiger population at ${fmt(last)}`;
      lede += `, ${rank === 1 ? "the " : (tied ? "joint " : "the ")}${rank === 1 ? "" : ordinal(rank) + " "}highest among the ${withLast.length} states in the national table.`;
    }
    // ----- tiles -----
    const tiles = [`<div class="tile"><b>${last === null ? "&ndash;" : fmt(last)}</b><span>${years[L]} estimate</span></div>`];
    if (prev !== null && last !== null) {
      const d = last - prev, pct = prev > 0 ? ` (${d >= 0 ? "+" : "−"}${Math.abs(Math.round((d / prev) * 100))}%)` : "";
      tiles.push(`<div class="tile"><b>${sgn(d)}</b><span>since ${years[L - 1]}${pct}</span></div>`);
    }
    if (firstIdx >= 0 && firstIdx < L - 1 && last !== null) {
      const d = last - v[firstIdx], pct = v[firstIdx] > 0 ? ` (${d >= 0 ? "+" : "−"}${Math.abs(Math.round((d / v[firstIdx]) * 100))}%)` : "";
      tiles.push(`<div class="tile"><b>${sgn(d)}</b><span>since ${years[firstIdx]}${pct}</span></div>`);
    }
    if (last) tiles.push(`<div class="tile"><b>${((last / nat[L]) * 100).toFixed(1)}%</b><span>of India's published ${fmt(nat[L])}</span></div>`);

    // ----- chart -----
    const W = 560, H = 230, pl = 14, bw = 70, gap = (W - pl * 2 - bw * years.length) / (years.length - 1), top = 36, base = 186;
    const mx = Math.max(peak, 1);
    const bars = years.map((y, k) => {
      const x = pl + k * (bw + gap), n = v[k];
      if (n === null) return `<text x="${x + bw / 2}" y="${base - 10}" text-anchor="middle" class="cv">&ndash;</text><text x="${x + bw / 2}" y="${base + 28}" text-anchor="middle" class="cy">${y}</text>`;
      const h = Math.max(n === 0 ? 0 : 3, ((base - top) * n) / mx);
      return `<rect x="${x}" y="${(base - h).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="6" class="${k === L ? "cur" : ""}"/><text x="${x + bw / 2}" y="${(base - h - 10).toFixed(1)}" text-anchor="middle" class="cv">${fmt(n)}</text><text x="${x + bw / 2}" y="${base + 28}" text-anchor="middle" class="cy">${y}</text>`;
    }).join("");
    const label = `Bar chart of estimated tigers in ${s.name}: ` + years.map((y, k) => `${y}: ${v[k] === null ? "no figure reported" : v[k]}`).join(", ");
    const chart = `<svg class="st-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><line x1="0" y1="${base}" x2="${W}" y2="${base}" class="ax"/>${bars}</svg>`;

    // ----- table -----
    const rows = years.map((y, k) => {
      const n = v[k], p = k ? v[k - 1] : null;
      const ch = n !== null && p !== null ? sgn(n - p) : "&ndash;";
      return `<tr><th scope="row">${y}</th><td class="num">${n === null ? "&ndash;" : fmt(n)}</td><td class="num">${ch}</td><td class="num">${fmt(nat[k])}</td></tr>`;
    }).join("");

    // ----- notes -----
    const notes = [];
    const missing = years.filter((_, k) => v[k] === null);
    if (missing.length) notes.push(`No figure was reported for ${esc(s.name)} in ${missing.join(", ")}. A dash is not the same as zero.`);
    if (s.id === "tg") notes.push("Telangana became a separate state in 2014, so its figures begin with the 2018 estimate.");
    if (s.note) notes.push(esc(s.note));
    if (last !== null && last !== peak) notes.push(`The highest figure reported for ${esc(s.name)} was ${fmt(peak)} in ${peakYear}.`);
    if (last === peak && last > 0 && v.filter((n) => n === peak).length === 1 && v.filter((n) => n !== null).length > 1) notes.push(`${years[L]} is the highest figure reported for ${esc(s.name)} so far.`);
    if (last !== null && last < 30) notes.push("When the numbers are small, a change of a few tigers can look large in percentage terms and the margin of uncertainty matters a lot.");
    notes.push(`These are statistical estimates, not head counts. The ${years[L]} national estimate had a range of 3,167 to 3,925, and state figures carry uncertainty too. State rows can differ slightly from the published national total.`);

    // ----- landscape & reserves -----
    const ls = tigers.landscapes[s.ls];
    const sameLs = entries.filter((o) => o.ls === s.ls && o.id !== s.id).map((o) => `<a href="${statePath(o.name)}">${esc(o.name)}</a>`).join(", ");
    const lsHtml = `<p>In the national table, ${esc(s.name)} is part of the <a href="/tiger-landscapes-india/">${esc(ls.name)}</a> landscape, which had ${fmt(ls.totals[L])} tigers in ${years[L]}.${sameLs ? ` Other states in this landscape: ${sameLs}.` : ""}</p>`;
    const res = resFile.reserves.filter((r) => r.state === s.name).sort((a, b) => b.areaKm2 - a.areaKm2);
    const resHtml = res.length
      ? `<p>${res.length === 1 ? "One" : res.length} of the ${resFile.count} tiger reserves on our <a href="/tiger-reserves-india/">reserves page</a> ${res.length === 1 ? "is" : "are"} in ${esc(s.name)}:</p><ul class="plain st-res">${res.map((r) => `<li><a href="/tiger-reserves-india/#r-${r.id}">${esc(r.name)}</a> <span>notified ${r.notified}, ${fmt(Math.round(r.areaKm2))} km²</span></li>`).join("")}</ul>`
      : `<p>None of the ${resFile.count} tiger reserves on our <a href="/tiger-reserves-india/">reserves page</a> (list as of ${new Date(resFile.asOf + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}) is in ${esc(s.name)}.</p>`;

    const prevS = entries[(i + entries.length - 1) % entries.length], nextS = entries[(i + 1) % entries.length];
    const phrase = last === 0 ? "no tigers were recorded in the 2022 estimate" : `an estimated ${fmt(last)} wild tigers in ${years[L]}`;
    const description = `${s.name}: ${phrase}. See the official ${years[0]} to ${years[L]} tiger estimates, how the number changed and its tiger reserves.`;
    const title = `Tigers in ${s.name}: Population ${years[0]} to ${years[L]}`;
    if (title.length > 60 || description.length > 160 || description.length < 70) throw new Error(`state page ${s.name}: title ${title.length}, description ${description.length}`);

    pages.push({
      path: statePath(s.name), src: "pages/state.html", out: `${statePath(s.name).slice(1)}index.html`, assetBase: "/",
      title, ogTitle: `Tigers in ${s.name}: official estimates 2006 to 2022`, description, ogType: "website", indexable: true,
      schema: "map", section: "maps",
      breadcrumb: [{ name: "Maps", path: "/maps/" }, { name: "Tigers by state", path: "/tiger-population-by-state/" }],
      crumbName: s.name,
      dataset: { name: `Estimated wild tigers in ${s.name}, ${years[0]} to ${years[L]}`, description: `All India Tiger Estimation figures for ${s.name} (${years.join(", ")}) from Government of India publications.`, source: tigers.sourceUrl },
      vars: {
        STATE_NAME: esc(s.name), STATE_LEDE: lede, STATE_TILES: tiles.join(""), STATE_CHART: chart, STATE_TABLE_ROWS: rows,
        STATE_NOTES: notes.map((n) => `<li>${n}</li>`).join(""), STATE_LANDSCAPE: lsHtml, STATE_RESERVES: resHtml, STATE_MAP: stateMap(s.id),
        STATE_HEAD_YEAR: String(years[L]), STATE_SOURCE_URL: tigers.sourceUrl,
        STATE_PREV: `<a href="${statePath(prevS.name)}">&larr; ${esc(prevS.name)}</a>`, STATE_NEXT: `<a href="${statePath(nextS.name)}">${esc(nextS.name)} &rarr;</a>`,
        STATE_ALL: entries.map((o) => `<li><a href="${statePath(o.name)}"${o.id === s.id ? ' aria-current="page"' : ""}>${esc(o.name)}</a></li>`).join(""),
      },
    });
  });
  return { pages, links: entries.map((o) => `<li><a href="${statePath(o.name)}">${esc(o.name)}</a></li>`).join("") };
}
