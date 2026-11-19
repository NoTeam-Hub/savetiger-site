import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const defs = readFileSync("/home/claude/savetiger-site/src/partials/svg-defs.html", "utf8");
const FORMATS = { phone: [1440, 3200], desktop: [3840, 2160] };
const FONT = "Inter, system-ui, sans-serif";
const AMBER = "#FF9A1F", ORANGE = "#E8590C", BG = "#0B130E", MUTED = "#9db3a4", TEXT = "#EAF2EC";

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// brand lockup: paw, wordmark, url
function lockup(x, y, k, anchor = "middle", dark = false) {
  const a = anchor, ink = dark ? BG : TEXT, sub = dark ? "#2a3a2e" : MUTED;
  const pawX = a === "middle" ? x - 36 * k : x - 72 * k;
  return `<g>
    <use href="#paw" x="${pawX}" y="${y}" width="${72 * k}" height="${72 * k}"/>
    <text x="${x}" y="${y + 120 * k}" text-anchor="${a}" font-family="${FONT}" font-weight="800" font-size="${26 * k}" letter-spacing="${9 * k}" fill="${sub}">SAVE THE</text>
    <text x="${x}" y="${y + 178 * k}" text-anchor="${a}" font-family="${FONT}" font-weight="900" font-size="${62 * k}" letter-spacing="${4 * k}" fill="${dark ? BG : "url(#wg)"}">TIGERS</text>
    <text x="${x}" y="${y + 222 * k}" text-anchor="${a}" font-family="${FONT}" font-weight="600" font-size="${24 * k}" letter-spacing="${2 * k}" fill="${ink}" opacity=".85">savethetiger.site</text>
  </g>`;
}
const commonDefs = `<linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${AMBER}"/><stop offset="1" stop-color="${ORANGE}"/></linearGradient>`;
const brandPos = (f, W, H, dark) => f === "phone" ? lockup(W / 2, H * 0.80, W / 1000 * 1.25, "middle", dark) : lockup(W - 150, H - 330, 1.2, "end", dark);


// ---------- shared landscape builder (same visual language as Forest dusk) ----------
function ridges(P, W, H, r, { hor, cols, mist = "#e9b86a", layers = 5, treeScale = 1, mistOp = 0.5 }) {
  let out = "";
  for (let L = 0; L < layers; L++) {
    const base = hor - (P ? 150 : 100) + L * (P ? 120 : 90), amp = (P ? 70 : 60) + L * 8;
    const yAt = (x) => base + amp * Math.sin(x * 0.0035 + L * 2) + amp * 0.4 * Math.sin(x * 0.011 + L);
    let d = `M0 ${H} L0 ${yAt(0)}`;
    for (let x = 0; x <= W; x += 40) d += ` L${x} ${yAt(x).toFixed(0)}`;
    d += ` L${W} ${H}Z`;
    let trees = "";
    const cnt = Math.round(W / (P ? 46 : 60) * (1 + L * 0.3));
    for (let i = 0; i < cnt; i++) {
      const x = r() * W, yb = yAt(x);
      const h = (P ? 120 : 130) * treeScale * (0.7 + r() * 0.9) * (1 + L * 0.35), w = h * (0.22 + r() * 0.1);
      trees += `<rect x="${(x - 5).toFixed(0)}" y="${(yb - h * 0.6).toFixed(0)}" width="10" height="${(h * 0.7).toFixed(0)}"/><ellipse cx="${x.toFixed(0)}" cy="${(yb - h * 0.75).toFixed(0)}" rx="${w.toFixed(0)}" ry="${(h * 0.38).toFixed(0)}"/>`;
    }
    out += `<g fill="${cols[L]}"><path d="${d}"/>${trees}</g>`;
    if (L < layers - 2) out += `<rect x="0" y="${base - 40}" width="${W}" height="${P ? 260 : 200}" fill="url(#mist)" opacity="${(mistOp - L * 0.1).toFixed(2)}"/>`;
  }
  return out;
}
const mistDef = (c, o = 0.35) => `<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".5" stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`;
const eyesAt = (cx, cy, w, op = 0.95) => `<use href="#eyes" x="${cx - w / 2}" y="${cy - w * 185 / 610 / 2}" width="${w}" height="${w * 185 / 610}" opacity="${op}"/>`;
const head = (P, W, H, line, anchor = P ? "middle" : "start") => P
  ? `${lockup(W / 2, H * 0.09, W / 1000 * 1.25, "middle")}<text x="${W / 2}" y="${H * 0.09 + 520}" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="46" fill="${TEXT}" opacity=".92">${line}</text>`
  : `${lockup(150, 140, 1.2, "start")}<text x="150" y="${140 + 350}" text-anchor="start" font-family="${FONT}" font-weight="600" font-size="46" fill="${TEXT}" opacity=".92">${line}</text>`;

// 06 Forest dawn
function dawn(f, W, H) {
  const P = f === "phone", r = rng(61), hor = H * (P ? 0.66 : 0.64);
  const ew = P ? W * 0.30 : 460;
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14263a"/><stop offset=".45" stop-color="#4a5f6b"/><stop offset=".78" stop-color="#e8a98a"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>${mistDef("#ffe6c4", 0.4)}
  <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF3D6"/><stop offset=".3" stop-color="#FFD08A"/><stop offset="1" stop-color="#FFB066" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="${W * 0.32}" cy="${hor - (P ? 90 : 40)}" r="${P ? 560 : 560}" fill="url(#sun)" opacity=".9"/>
  ${ridges(P, W, H, r, { hor, cols: ["#6d6a66", "#4f5a52", "#2f4a3a", "#183024", "#0b1810"], mist: "#ffe6c4", mistOp: 0.6 })}
  ${eyesAt(W * (P ? 0.5 : 0.7), H * (P ? 0.925 : 0.9), ew)}
  ${head(P, W, H, "A new day for the forest.")}`;
}

// 07 Moonlit forest
function moon(f, W, H) {
  const P = f === "phone", r = rng(71), hor = H * (P ? 0.68 : 0.66);
  let stars = "", fire = "";
  for (let i = 0; i < 140; i++) stars += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * hor * 0.75).toFixed(0)}" r="${(1 + r() * 2.8).toFixed(1)}" fill="#fff" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
  for (let i = 0; i < 50; i++) { const x = r() * W, y = hor * 0.7 + r() * (H - hor * 0.7) * 0.9, s = 3 + r() * 6; fire += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(s * 3).toFixed(0)}" fill="#e8ff9a" opacity=".10"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="#f4ffb8" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`; }
  const mr = P ? 230 : 250, mx = W * (P ? 0.66 : 0.7), my = H * (P ? 0.42 : 0.25);
  const ew = P ? W * 0.30 : 460;
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b16"/><stop offset=".6" stop-color="#0f2a3a"/><stop offset="1" stop-color="#2b5a5c"/></linearGradient>${mistDef("#9fd0d4", 0.28)}
  <radialGradient id="mg" cx="50%" cy="50%" r="50%"><stop offset=".4" stop-color="#cfe8ff" stop-opacity=".35"/><stop offset="1" stop-color="#cfe8ff" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}
  <circle cx="${mx}" cy="${my}" r="${mr * 2.6}" fill="url(#mg)"/><circle cx="${mx}" cy="${my}" r="${mr}" fill="#f3f1e6"/>
  <circle cx="${mx - mr * 0.3}" cy="${my - mr * 0.15}" r="${mr * 0.18}" fill="#dcdacb"/><circle cx="${mx + mr * 0.25}" cy="${my + mr * 0.3}" r="${mr * 0.12}" fill="#dcdacb"/><circle cx="${mx + mr * 0.35}" cy="${my - mr * 0.35}" r="${mr * 0.09}" fill="#e2e0d2"/>
  ${ridges(P, W, H, r, { hor, cols: ["#1d4147", "#143338", "#0e272b", "#091b1e", "#050d10"], mistOp: 0.55 })}${fire}
  ${eyesAt(W * (P ? 0.5 : 0.28), H * (P ? 0.925 : 0.9), ew)}
  ${head(P, W, H, "Even the night belongs to them.")}`;
}

// 08 Monsoon mist
function monsoon(f, W, H) {
  const P = f === "phone", r = rng(81), hor = H * (P ? 0.64 : 0.62);
  let rain = "";
  for (let i = 0; i < (P ? 220 : 320); i++) { const x = r() * W, y = r() * H, l = 40 + r() * 70; rain += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - l * 0.18).toFixed(0)}" y2="${(y + l).toFixed(0)}" stroke="#cfe6dc" stroke-width="${(1.5 + r() * 1.8).toFixed(1)}" opacity="${(0.05 + r() * 0.16).toFixed(2)}"/>`; }
  const ew = P ? W * 0.30 : 460;
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2b26"/><stop offset=".6" stop-color="#46605a"/><stop offset="1" stop-color="#8aa79c"/></linearGradient>${mistDef("#dcefe6", 0.5)}</defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${ridges(P, W, H, r, { hor, cols: ["#7e9a90", "#5d7b70", "#3f5d52", "#24392f", "#0d1a14"], mistOp: 0.9, layers: 5 })}
  <rect width="${W}" height="${H}" fill="#dcefe6" opacity=".05"/>${rain}
  ${eyesAt(W * (P ? 0.5 : 0.7), H * (P ? 0.925 : 0.9), ew, 0.9)}
  ${head(P, W, H, "Monsoon in the tiger forest.")}`;
}

// 09 Grassland golden hour (foreground blades)
function grass(f, W, H) {
  const P = f === "phone", r = rng(91), hor = H * (P ? 0.60 : 0.58);
  let blades = "";
  const n = P ? 150 : 240;
  for (let i = 0; i < n; i++) {
    const x = r() * W, h = (P ? 380 : 330) * (0.35 + r() * 0.95) * (0.5 + 0.5 * (x / W > 0.5 ? 1 : 1)), bend = (r() - 0.5) * 120, w = 7 + r() * 11, y0 = H + 20;
    blades += `<path d="M${(x - w).toFixed(0)} ${y0} Q${(x + bend * 0.3).toFixed(0)} ${(y0 - h * 0.6).toFixed(0)} ${(x + bend).toFixed(0)} ${(y0 - h).toFixed(0)} Q${(x + bend * 0.3 + w).toFixed(0)} ${(y0 - h * 0.55).toFixed(0)} ${(x + w).toFixed(0)} ${y0}Z"/>`;
  }
  const ew = P ? W * 0.30 : 460;
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1d1a"/><stop offset=".5" stop-color="#b24a1c"/><stop offset=".85" stop-color="#ffb347"/><stop offset="1" stop-color="#ffd27a"/></linearGradient>${mistDef("#ffcf8a", 0.4)}
  <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF1C9"/><stop offset=".3" stop-color="#FFC24A"/><stop offset="1" stop-color="#FF9A1F" stop-opacity="0"/></radialGradient>
  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4a1a"/><stop offset="1" stop-color="#120c05"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="${W * 0.5}" cy="${hor - (P ? 40 : 10)}" r="${P ? 600 : 620}" fill="url(#sun)"/>
  ${ridges(P, W, H, r, { hor: hor - 40, cols: ["#5a3a1a", "#3d2a14", "#2a1d0e", "#1a1209"], layers: 4, treeScale: 0.8, mistOp: 0.55 })}
  <rect y="${H * 0.82}" width="${W}" height="${H * 0.18}" fill="url(#gr)" opacity=".0"/>
  <g fill="#0a0703">${blades}</g>
  ${eyesAt(W * (P ? 0.5 : 0.68), H * (P ? 0.885 : 0.86), ew, 1)}
  ${head(P, W, H, "Where the tall grass moves.")}`;
}

// 10 Mangrove twilight (Sundarbans), with water reflection
function mangrove(f, W, H) {
  const P = f === "phone", r = rng(101), hor = H * (P ? 0.56 : 0.54);
  let trees = "";
  const n = P ? 26 : 44;
  for (let i = 0; i < n; i++) {
    const x = r() * W, h = (P ? 150 : 150) * (0.6 + r() * 1.3), w = h * (0.35 + r() * 0.3);
    let roots = ""; for (let k = 0; k < 6; k++) { const rx = x + (k - 2.5) * w * 0.22; roots += `<path d="M${rx.toFixed(0)} ${hor} Q${(rx + (k - 2.5) * 8).toFixed(0)} ${(hor - h * 0.3).toFixed(0)} ${(x + (k - 2.5) * 5).toFixed(0)} ${(hor - h * 0.5).toFixed(0)}" stroke="#08110d" stroke-width="5" fill="none"/>`; }
    trees += `${roots}<ellipse cx="${x.toFixed(0)}" cy="${(hor - h * 0.72).toFixed(0)}" rx="${w.toFixed(0)}" ry="${(h * 0.32).toFixed(0)}"/><ellipse cx="${(x + w * 0.5).toFixed(0)}" cy="${(hor - h * 0.58).toFixed(0)}" rx="${(w * 0.7).toFixed(0)}" ry="${(h * 0.24).toFixed(0)}"/>`;
  }
  let ripples = ""; for (let i = 0; i < 60; i++) { const x = r() * W, y = hor + 20 + r() * (H - hor - 20), l = 60 + r() * 220; ripples += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + l).toFixed(0)}" y2="${y.toFixed(0)}" stroke="#ffcf9a" stroke-width="${(2 + r() * 3).toFixed(1)}" opacity="${(0.05 + r() * 0.18).toFixed(2)}"/>`; }
  const ew = P ? W * 0.30 : 460;
  const sunY = hor - (P ? 120 : 60);
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1640"/><stop offset=".5" stop-color="#7a3f6a"/><stop offset=".85" stop-color="#f2845c"/><stop offset="1" stop-color="#ffc27a"/></linearGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0805e"/><stop offset=".35" stop-color="#4b3a5c"/><stop offset="1" stop-color="#0b1518"/></linearGradient>
  <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE8B8"/><stop offset=".35" stop-color="#FFA65A"/><stop offset="1" stop-color="#FF7A3A" stop-opacity="0"/></radialGradient>
  <filter id="rb" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="28"/></filter><linearGradient id="refl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC27A" stop-opacity=".55"/><stop offset="1" stop-color="#FFC27A" stop-opacity="0"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="${W * 0.5}" cy="${sunY}" r="${P ? 480 : 520}" fill="url(#sun)"/>
  <rect y="${hor}" width="${W}" height="${H - hor}" fill="url(#water)"/>
  <rect x="${W * 0.5 - (P ? 120 : 160)}" y="${hor}" width="${P ? 240 : 320}" height="${(H - hor) * 0.8}" fill="url(#refl)" filter="url(#rb)"/>${ripples}
  <g fill="#08110d">${trees}</g>
  <rect y="${hor - 6}" width="${W}" height="12" fill="#08110d"/>
  ${eyesAt(W * (P ? 0.5 : 0.7), H * (P ? 0.90 : 0.88), ew, 0.95)}
  ${head(P, W, H, "Where the river meets the tiger.")}`;
}

const DESIGNS = [["06-forest-dawn", dawn], ["07-moonlit-forest", moon], ["08-monsoon-mist", monsoon], ["09-golden-grassland", grass], ["10-mangrove-twilight", mangrove]];
const b = await chromium.launch();
for (const [name, fn] of DESIGNS) for (const [f, [W, H]] of Object.entries(FORMATS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${commonDefs}${fn(f, W, H)}</svg>`;
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}svg{display:block}</style>${defs}${svg}`;
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  await pg.setContent(html); await pg.waitForTimeout(200);
  await pg.screenshot({ path: `out/savethetiger-${name}-${f}.jpg`, type: "jpeg", quality: 90 });
  await pg.close(); console.log(name, f);
}
await b.close();
