// One-off helper (NOT part of the site build): fits the lon/lat -> SVG transform for data/india-map.json
// using known state extremes, then checks every reserve lands inside its own state.
// Needs Playwright (any Chromium). The fitted numbers are stored in data/india-map.json under "projection".
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";

const mapPath = new URL("../data/india-map.json", import.meta.url);
const map = JSON.parse(readFileSync(mapPath, "utf8"));
const reserves = JSON.parse(readFileSync(new URL("../data/reserves.json", import.meta.url), "utf8")).reserves;

// [id, lonMin, lonMax, latMin, latMax]  (well-known state extremes, degrees)
const KNOWN = [
  ["gj", 68.16, 74.48, 20.12, 24.71], ["kl", 74.86, 77.42, 8.29, 12.79], ["tn", 76.23, 80.35, 8.07, 13.57],
  ["ar", 91.55, 97.42, 26.65, 29.47], ["sk", 88.00, 88.92, 27.08, 28.13], ["ga", 73.68, 74.34, 14.89, 15.80],
  ["ka", 74.05, 78.59, 11.59, 18.45], ["or", 81.37, 87.49, 17.78, 22.57], ["tr", 91.15, 92.34, 22.95, 24.53],
  ["as", 89.69, 96.02, 24.13, 28.17], ["rj", 69.48, 78.27, 23.06, 30.19], ["pb", 73.88, 76.94, 29.54, 32.51],
  ["ut", 77.57, 81.04, 28.72, 31.45], ["wb", 85.82, 89.88, 21.53, 27.22], ["ml", 89.82, 92.80, 25.03, 26.12],
  ["mn", 93.03, 94.78, 23.83, 25.68], ["mz", 92.26, 93.44, 21.96, 24.52], ["nl", 93.33, 95.25, 25.20, 27.04],
  ["jh", 83.33, 87.98, 21.97, 25.35], ["br", 83.32, 88.29, 24.29, 27.52], ["hr", 74.46, 77.60, 27.65, 31.0],
];

const browser = await chromium.launch();
const page = await browser.newPage();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${map.viewBox}">` +
  map.locations.map((l) => `<path id="${l.id}" d="${l.path}"/>`).join("") + `</svg>`;
await page.setContent(`<body>${svg}</body>`);
const boxes = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("path")].map((p) => { const b = p.getBBox(); return [p.id, [b.x, b.x + b.width, b.y, b.y + b.height]]; })));

function fit(pairs) { // least squares v = a*u + b
  const n = pairs.length, su = pairs.reduce((s, p) => s + p[0], 0), sv = pairs.reduce((s, p) => s + p[1], 0);
  const suu = pairs.reduce((s, p) => s + p[0] * p[0], 0), suv = pairs.reduce((s, p) => s + p[0] * p[1], 0);
  const a = (n * suv - su * sv) / (n * suu - su * su); return [a, (sv - a * su) / n];
}
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
function robust(pairs, label) {
  let use = pairs.slice(), f;
  for (let i = 0; i < 6; i++) {
    f = fit(use.map((p) => [p.u, p.v]));
    const res = use.map((p) => Math.abs(f[0] * p.u + f[1] - p.v));
    const rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length);
    const worst = Math.max(...res);
    if (worst < 2.2 * rms + 1 || use.length < 8) { f.rms = rms; break; }
    use.splice(res.indexOf(worst), 1);
  }
  const res = pairs.map((p) => f[0] * p.u + f[1] - p.v);
  console.log(`${label}: v = ${f[0].toFixed(4)}*u + ${f[1].toFixed(3)} | kept ${use.length}/${pairs.length} | rms ${Math.sqrt(use.reduce((s,p)=>s+(f[0]*p.u+f[1]-p.v)**2,0)/use.length).toFixed(2)} px | max |err| ${Math.max(...res.map(Math.abs)).toFixed(1)} px`);
  return f;
}
const xp = [], yL = [], yM = [];
for (const [id, lo, hi, la, lb] of KNOWN) {
  const b = boxes[id]; if (!b) continue;
  xp.push({ u: lo, v: b[0] }, { u: hi, v: b[1] });
  yL.push({ u: la, v: b[3] }, { u: lb, v: b[2] });
  yM.push({ u: merc(la), v: b[3] }, { u: merc(lb), v: b[2] });
}
const fx = robust(xp, "x(lon)");
const fyL = robust(yL, "y(lat) linear");
const fyM = robust(yM, "y(lat) mercator");
const mercator = Math.abs(fyM[0]) && true;
const useMerc = process.argv.includes("--mercator");
const fy = useMerc ? fyM : fyL;
const proj = (lon, lat) => [fx[0] * lon + fx[1], fy[0] * (useMerc ? merc(lat) : lat) + fy[1]];

// Each reserve must fall inside its own state (a few sit right on a border; those are listed, not hidden).
const stateId = { "Andhra Pradesh": "ap", "Arunachal Pradesh": "ar", "Assam": "as", "Bihar": "br", "Chhattisgarh": "ct", "Jharkhand": "jh", "Karnataka": "ka", "Kerala": "kl", "Madhya Pradesh": "mp", "Maharashtra": "mh", "Mizoram": "mz", "Odisha": "or", "Rajasthan": "rj", "Tamil Nadu": "tn", "Telangana": "tg", "Uttar Pradesh": "up", "Uttarakhand": "ut", "West Bengal": "wb" };
const pts = reserves.map((r) => ({ ...r, xy: proj(r.lon, r.lat) }));
const result = await page.evaluate(({ pts, stateId }) => pts.map((r) => {
  const own = document.getElementById(stateId[r.state]);
  const pt = new DOMPoint(r.xy[0], r.xy[1]);
  const inside = own.isPointInFill(pt);
  let actual = null;
  for (const p of document.querySelectorAll("path")) if (p.isPointInFill(pt)) { actual = p.id; break; }
  return { id: r.id, state: r.state, inside, actual };
}), { pts, stateId });
const bad = result.filter((r) => !r.inside);
console.log(`\n${result.length - bad.length}/${result.length} reserves fall inside their own state`);
for (const b of bad) console.log("  outside own state:", b.id, `(${b.state}) -> lands in`, b.actual);

// ---- Nudge dots that fall just outside their own state on this simplified map ----
const inv = ([x, y]) => {
  const lon = (x - fx[1]) / fx[0];
  const m = (y - fy[1]) / fy[0];
  const lat = useMerc ? ((2 * Math.atan(Math.exp(m)) - Math.PI / 2) * 180) / Math.PI : m;
  return [lon, lat];
};
const nudges = {};
for (const b of bad) {
  const r = pts.find((q) => q.id === b.id);
  const found = await page.evaluate(({ id, state, xy }) => {
    const own = document.getElementById(state);
    const inside = (x, y) => own.isPointInFill(new DOMPoint(x, y));
    let best = null;
    for (let dx = -14; dx <= 14; dx += 0.5) for (let dy = -14; dy <= 14; dy += 0.5) {
      const x = xy[0] + dx, y = xy[1] + dy;
      if (!inside(x, y)) continue;
      let depth = 0;
      for (const [ox, oy] of [[3,0],[-3,0],[0,3],[0,-3],[2,2],[-2,2],[2,-2],[-2,-2]]) if (inside(x + ox, y + oy)) depth++;
      const score = Math.hypot(dx, dy) - 0.9 * depth;
      if (!best || score < best.score) best = { x, y, score, dist: Math.hypot(dx, dy) };
    }
    return best;
  }, { id: r.id, state: stateId[r.state], xy: r.xy });
  if (!found) { console.log("  could not place", r.id); continue; }
  const [lon, lat] = inv([found.x, found.y]);
  nudges[r.id] = { displayLat: +lat.toFixed(3), displayLon: +lon.toFixed(3) };
  console.log(`  nudged ${r.id}: moved ${(found.dist * 111 / 21.9 / 1).toFixed(0)} km-ish (${found.dist.toFixed(1)} px) -> ${lat.toFixed(3)}, ${lon.toFixed(3)}`);
}

await browser.close();

if (process.argv.includes("--write")) {
  map.projection = { type: useMerc ? "mercator" : "linear", x: fx.slice(0, 2), y: fy.slice(0, 2) };
  writeFileSync(mapPath, JSON.stringify(map));
  const resPath = new URL("../data/reserves.json", import.meta.url);
  const rs = JSON.parse(readFileSync(resPath, "utf8"));
  for (const r of rs.reserves) { delete r.displayLat; delete r.displayLon; if (nudges[r.id]) Object.assign(r, nudges[r.id]); }
  rs.displayNote = "Where displayLat/displayLon exist, the map dot was moved a short distance so it sits inside the correct state on the simplified map (for example Pench's two halves share one published coordinate on a state border).";
  writeFileSync(resPath, JSON.stringify(rs, null, 1));
  console.log("wrote projection", JSON.stringify(map.projection));
}
