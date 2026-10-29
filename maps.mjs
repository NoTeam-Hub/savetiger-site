// Build-time map generator for the /maps/ pages.
// Reads data/*.json and returns HTML strings that build.mjs drops into the page templates.
// No map library and no tiles: just inline SVG, so the maps cost no extra requests.

import { readFile } from "node:fs/promises";
import path from "node:path";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => Number(n).toLocaleString("en-IN");

// ---------- path simplification (round to 0.1 px, drop specks) ----------
function parsePath(d) {
  const tok = d.match(/[mMlLzZ]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const polys = [];
  let cmd = "", i = 0, x = 0, y = 0, cur = null, sx = 0, sy = 0;
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/^[mMlLzZ]$/.test(tok[i])) cmd = tok[i++];
    if (cmd === "z" || cmd === "Z") { if (cur) { polys.push(cur); cur = null; } x = sx; y = sy; continue; }
    const a = num(), b = num();
    if (cmd === "m" || cmd === "M") {
      if (cur) polys.push(cur);
      x = cmd === "m" && polys.length + (cur ? 1 : 0) > 0 ? x + a : a;
      y = cmd === "m" && polys.length + (cur ? 1 : 0) > 0 ? y + b : b;
      sx = x; sy = y; cur = [[x, y]];
      cmd = cmd === "m" ? "l" : "L";
    } else {
      x = cmd === "l" ? x + a : a;
      y = cmd === "l" ? y + b : b;
      cur.push([x, y]);
    }
  }
  if (cur) polys.push(cur);
  return polys;
}

function simplify(d, minArea = 0.6) {
  const out = [];
  for (const poly of parsePath(d)) {
    const pts = [];
    for (const [x, y] of poly) {
      const p = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
      const last = pts[pts.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p);
    }
    if (pts.length < 3) continue;
    let area = 0;
    for (let k = 0; k < pts.length; k++) {
      const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % pts.length];
      area += x1 * y2 - x2 * y1;
    }
    if (Math.abs(area / 2) < minArea) continue;
    let s = `M${pts[0][0]} ${pts[0][1]}`;
    let px = pts[0][0], py = pts[0][1];
    for (let k = 1; k < pts.length; k++) {
      const dx = Math.round((pts[k][0] - px) * 10) / 10, dy = Math.round((pts[k][1] - py) * 10) / 10;
      if (dx === 0 && dy === 0) continue;
      s += `l${dx} ${dy}`;
      px += dx; py += dy;
    }
    out.push(s + "z");
  }
  return out.join("").replace(/ -/g, "-");
}

export async function loadMaps(root) {
  const rd = async (f) => JSON.parse(await readFile(path.join(root, "data", f), "utf8"));
  const [india, resFile, tigers] = await Promise.all([rd("india-map.json"), rd("reserves.json"), rd("tigers.json")]);

  const { x: [ax, bx], y: [ay, by] } = india.projection;
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const proj = (lat, lon) => [ax * lon + bx, ay * merc(lat) + by];
  const r1 = (n) => Math.round(n * 10) / 10;

  const nameToId = Object.fromEntries(india.locations.map((l) => [l.name, l.id]));
  const shapes = india.locations.map((l) => ({ id: l.id, name: l.name, d: simplify(l.path) }));
  const lsOf = { ...Object.fromEntries(Object.entries(tigers.states).map(([id, s]) => [id, s.ls])) };

  const reserves = resFile.reserves
    .map((r) => {
      const [x, y] = proj(r.displayLat ?? r.lat, r.displayLon ?? r.lon);
      const sid = nameToId[r.state];
      if (!sid) throw new Error(`reserve ${r.id}: unknown state "${r.state}"`);
      let ls = lsOf[sid] || "ci";
      if (r.id === "sundarbans") ls = "sb";
      return { ...r, x: r1(x), y: r1(y), sid, ls, rad: r1(2.8 + Math.sqrt(r.areaKm2 / 3300) * 3.2) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const lsNames = Object.fromEntries(Object.entries(tigers.landscapes).map(([k, v]) => [k, v.name]));
  const years = tigers.years;

  // ---------- shared pieces ----------
  const stateBin = (v) => (v === null ? "bn" : v === 0 ? "b0" : v < 20 ? "b1" : v < 100 ? "b2" : v < 300 ? "b3" : v < 600 ? "b4" : "b5");
  const BINS = [
    ["bn", "No figure reported"],
    ["b0", "0 tigers"],
    ["b1", "1 to 19"],
    ["b2", "20 to 99"],
    ["b3", "100 to 299"],
    ["b4", "300 to 599"],
    ["b5", "600 or more"],
  ];

  const statePaths = (fn) =>
    shapes
      .map((s) => {
        const extra = fn(s);
        return `<path class="st${extra.cls ? " " + extra.cls : ""}"${extra.attrs || ""} data-s="${s.id}" d="${s.d}"><title>${esc(extra.title || s.name)}</title></path>`;
      })
      .join("");

  const svgOpen = (cls, label) =>
    `<svg class="map ${cls}" viewBox="${india.viewBox}" role="group" aria-label="${esc(label)}" focusable="false">`;

  const dots = (interactive = true) =>
    reserves
      .map((r) => {
        const a = interactive ? ` tabindex="0" role="button" aria-label="${esc(r.name + ", " + r.state)}"` : ' aria-hidden="true"';
        return `<g class="dot ${r.ls}" data-id="${r.id}" data-s="${r.sid}"${a} transform="translate(${r.x} ${r.y})">${interactive ? '<circle class="hit" r="9"/>' : ""}<circle class="pt" r="${r.rad}"/></g>`;
      })
      .join("");

  const vars = {};

  // ---------- 1. tiger reserves ----------
  const areaTotal = reserves.reduce((a, r) => a + r.areaKm2, 0);
  vars.MAP_RESERVES = svgOpen("map-reserves", "Map of India with a dot for each tiger reserve") +
    `<g class="states">${statePaths(() => ({ title: "" })).replace(/<title><\/title>/g, "")}</g><g class="dots">${dots()}</g></svg>`;
  vars.RESERVE_ROWS = reserves
    .map(
      (r) =>
        `<tr id="r-${r.id}" data-id="${r.id}" data-s="${r.sid}"><th scope="row">${esc(r.name)}</th><td>${esc(r.state)}</td><td>${r.notified}</td><td class="num">${fmt(Math.round(r.areaKm2))}</td><td>${esc(lsNames[r.ls])}</td></tr>`,
    )
    .join("");
  const stateOpts = [...new Set(reserves.map((r) => r.sid))]
    .map((sid) => [sid, india.locations.find((l) => l.id === sid).name])
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([sid, n]) => `<option value="${sid}">${esc(n)}</option>`)
    .join("");
  vars.RESERVE_STATE_OPTIONS = stateOpts;
  vars.RESERVE_COUNT = String(reserves.length);
  vars.RESERVE_AREA = fmt(Math.round(areaTotal));
  vars.RESERVE_STATE_COUNT = String(new Set(reserves.map((r) => r.sid)).size);
  vars.RESERVE_ASOF = esc(resFile.asOf || "");

  // ---------- 2. population by state ----------
  const idx = years.length - 1;
  vars.MAP_STATES =
    svgOpen("map-states", "Map of India shaded by the estimated number of tigers in each state") +
    `<g class="states">${statePaths((s) => {
      const t = tigers.states[s.id];
      if (!t) return { cls: "bn", title: `${s.name}: no figure in the national table` };
      const v = t.v[idx];
      return {
        cls: stateBin(v),
        attrs: ` data-v="${t.v.map((n) => (n === null ? "" : n)).join(",")}" data-n="${esc(t.name)}" tabindex="0"`,
        title: `${t.name}: ${v === null ? "no figure reported" : fmt(v)}`,
      };
    })}</g></svg>`;
  vars.STATE_LEGEND = BINS.map(([c, l]) => `<li><span class="sw ${c}"></span>${l}</li>`).join("");
  vars.YEAR_BUTTONS = years
    .map((y, i) => `<button type="button" role="radio" aria-checked="${i === idx}" data-i="${i}"${i === idx ? ' class="on"' : ""}>${y}</button>`)
    .join("");
  const stateList = Object.entries(tigers.states).sort((a, b) => (b[1].v[idx] ?? -1) - (a[1].v[idx] ?? -1));
  vars.STATE_ROWS = stateList
    .map(([id, s]) => {
      const cells = s.v.map((n) => `<td class="num">${n === null ? "&ndash;" : fmt(n)}</td>`).join("");
      return `<tr data-s="${id}"><th scope="row">${esc(s.name)}${s.note ? `<sup><a href="#note-wb" aria-label="note">*</a></sup>` : ""}</th>${cells}</tr>`;
    })
    .join("");
  vars.STATE_HEAD = years.map((y) => `<th scope="col" class="num">${y}</th>`).join("");
  vars.STATE_TOTAL = tigers.nationalTotals.map((n) => `<td class="num">${fmt(n)}</td>`).join("");
  vars.YEARS_JSON = JSON.stringify(years);
  vars.TOP_STATE = esc(stateList[0][1].name);
  vars.TOP_STATE_N = fmt(stateList[0][1].v[idx]);

  // ---------- 3. landscapes ----------
  const lsKeys = ["sh", "ci", "wg", "ne", "sb"];
  vars.MAP_LANDSCAPES =
    svgOpen("map-landscapes", "Map of India with states and tiger reserves coloured by tiger landscape") +
    `<g class="states">${statePaths((s) => {
      const t = tigers.states[s.id];
      return t ? { cls: "ls-" + t.ls, attrs: ` data-ls="${t.ls}"`, title: `${t.name}: ${lsNames[t.ls]}` } : { cls: "", title: s.name };
    })}</g><g class="dots">${dots(false)}</g></svg>`;
  vars.LANDSCAPE_LEGEND = lsKeys
    .map((k) => `<li><button type="button" class="ls-btn" data-ls="${k}" aria-pressed="false"><span class="sw ls-${k}"></span>${esc(tigers.landscapes[k].short)}</button></li>`)
    .join("");
  const bar = (arr) => {
    const max = Math.max(...arr.map((n) => n || 0));
    const w = 22, g = 10, h = 54;
    return `<svg class="spark" viewBox="0 0 ${years.length * (w + g) - g} ${h + 14}" role="img" aria-label="Estimates: ${arr.map((n, i) => `${years[i]}: ${n === null ? "no figure" : fmt(n)}`).join(", ")}">${arr
      .map((n, i) => {
        const bh = n === null ? 0 : Math.max(2, Math.round((n / max) * h));
        return `<rect x="${i * (w + g)}" y="${h - bh}" width="${w}" height="${bh}" rx="3"/><text x="${i * (w + g) + w / 2}" y="${h + 11}" text-anchor="middle">${String(years[i]).slice(2)}</text>`;
      })
      .join("")}</svg>`;
  };
  vars.LANDSCAPE_CARDS = lsKeys
    .map((k) => {
      const l = tigers.landscapes[k];
      const cur = l.totals[idx], prev = l.totals[idx - 1];
      const stNames = l.states.map((id) => tigers.states[id].name);
      const where = k === "sb" ? "Indian Sundarbans, West Bengal" : k === "ne" ? `${stNames.join(", ")} and northern West Bengal` : stNames.join(", ");
      const delta = cur - prev;
      const nRes = reserves.filter((r) => r.ls === k).length;
      return `<article class="ls-card" data-ls="${k}" tabindex="0"><span class="sw ls-${k}"></span><h2>${esc(l.name)}</h2><p class="big">${fmt(cur)}<small> tigers, 2022</small></p><p class="chg">${delta >= 0 ? "+" : "&minus;"}${fmt(Math.abs(delta))} since 2018 &middot; ${nRes} reserve${nRes === 1 ? "" : "s"} on the map</p>${bar(l.totals)}<p class="where">${esc(where)}</p></article>`;
    })
    .join("");

  // ---------- 4. paw trail (hub hero) ----------
  const byId = Object.fromEntries(reserves.map((r) => [r.id, r]));
  const trailA = ["corbett", "dudhwa", "kanha", "tadoba-andhari", "nagarjunsagar-srisailam", "bhadra", "periyar"];
  const trailB = ["kanha", "similipal", "sundarbans", "manas", "kaziranga"];
  const labels = { corbett: "Shivalik-Gangetic", kanha: "Central India", bhadra: "Western Ghats", kaziranga: "North-East", sundarbans: "Sundarbans" };
  const catmull = (pts, step) => {
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    const out = [];
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      for (let t = 0; t < 1; t += 0.04) {
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1]);
    // resample at equal distance
    const res = [out[0]];
    let acc = 0;
    for (let i = 1; i < out.length; i++) {
      const d = Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
      acc += d;
      if (acc >= step) { res.push(out[i]); acc = 0; }
    }
    return res;
  };
  let n = 0;
  const pawsFor = (ids) => {
    const pts = ids.map((id) => [byId[id].x, byId[id].y]);
    const line = catmull(pts, 17);
    return line
      .map((p, i) => {
        const q = line[Math.min(i + 1, line.length - 1)], o = line[Math.max(i - 1, 0)];
        const ang = (Math.atan2(q[1] - o[1], q[0] - o[0]) * 180) / Math.PI + 90;
        const side = i % 2 ? 1 : -1;
        const nx = Math.cos(((ang - 90) * Math.PI) / 180 + Math.PI / 2) * 4.5 * side;
        const ny = Math.sin(((ang - 90) * Math.PI) / 180 + Math.PI / 2) * 4.5 * side;
        const s = 15;
        return `<use class="p" style="--i:${n++}" href="#paw-plain" x="${r1(p[0] + nx - s / 2)}" y="${r1(p[1] + ny - s / 2)}" width="${s}" height="${s}" transform="rotate(${Math.round(ang)} ${r1(p[0] + nx)} ${r1(p[1] + ny)})"/>`;
      })
      .join("");
  };
  const trail = pawsFor(trailA) + pawsFor(trailB);
  const labelEls = Object.entries(labels)
    .map(([id, t]) => {
      const r = byId[id];
      const right = ["sundarbans", "bhadra"].includes(id);
      return `<g class="lbl"><circle cx="${r.x}" cy="${r.y}" r="3.4"/><text x="${r.x + (right ? 9 : -9)}" y="${r.y + 4}" text-anchor="${right ? "start" : "end"}">${esc(t)}</text></g>`;
    })
    .join("");
  vars.MAP_TRAIL =
    `<svg class="map map-trail" viewBox="${india.viewBox}" aria-hidden="true" focusable="false"><g class="states">${statePaths(() => ({ title: "" })).replace(/<title><\/title>/g, "")}</g><g class="trail">${trail}</g>${labelEls}</svg>`;

  vars.MAP_CREDIT = esc(india.credit.replace(/\s+https?:\S+/, ""));
  vars.MAP_CREDIT_URL = india.creditUrl;

  return vars;
}
