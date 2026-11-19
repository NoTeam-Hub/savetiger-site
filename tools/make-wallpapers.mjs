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

// 1. Eyes in the dark
function eyes(f, W, H) {
  const r = rng(7), P = f === "phone";
  const ew = P ? W * 0.84 : W * 0.46, eh = ew * 185 / 610;
  const ex = (W - ew) / 2, ey = P ? H * 0.40 - eh / 2 : H * 0.44 - eh / 2;
  let sparks = "";
  for (let i = 0; i < (P ? 70 : 90); i++) { const x = r() * W, y = r() * H, s = 1.5 + r() * 4; sparks += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="${AMBER}" opacity="${(0.12 + r() * 0.5).toFixed(2)}"/>`; }
  return `<defs><radialGradient id="gl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${AMBER}" stop-opacity=".30"/><stop offset="1" stop-color="${AMBER}" stop-opacity="0"/></radialGradient>
  <radialGradient id="vg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#0f1b13"/><stop offset="1" stop-color="#040806"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#vg)"/>
  <ellipse cx="${W / 2}" cy="${ey + eh / 2}" rx="${ew * 0.85}" ry="${eh * 2.2}" fill="url(#gl)"/>${sparks}
  <use href="#eyes" x="${ex}" y="${ey}" width="${ew}" height="${eh}"/>
  <text x="${W / 2}" y="${ey + eh + (P ? 230 : 190)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${P ? 64 : 50}" letter-spacing="${P ? 24 : 20}" fill="${MUTED}">STILL WATCHING</text>
  <text x="${W / 2}" y="${ey + eh + (P ? 310 : 260)}" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="${P ? 48 : 38}" fill="${MUTED}" opacity=".85">Wild tigers still need our help.</text>
  ${brandPos(f, W, H)}`;
}

// 2. Stripes
function stripes(f, W, H) {
  const r = rng(21), P = f === "phone";
  const n = P ? 30 : 46; let s = "";
  for (let i = 0; i < n; i++) {
    const base = r() * W;
    const ys = -100 + r() * H * 0.95, len = H * (0.22 + r() * 0.32), wmax = (P ? 120 : 150) * (0.5 + r() * 0.9);
    const A = (P ? 60 : 90) * (0.4 + r()), fr = (0.0012 + r() * 0.002), ph = r() * 6.28, tilt = (r() - 0.5) * (P ? 0.3 : 0.25);
    const L = [], R = [];
    for (let y = ys; y <= ys + len; y += 20) {
      const t = (y - ys) / len, w = wmax * Math.pow(Math.sin(Math.PI * t), 0.75);
      const cx = base + A * Math.sin(y * fr + ph) + (y - H / 2) * tilt;
      L.push([cx - w / 2, y]); R.push([cx + w / 2, y]);
    }
    const pts = L.concat(R.reverse()).map(p => p[0].toFixed(0) + "," + p[1].toFixed(0)).join(" ");
    s += `<polygon points="${pts}" fill="${BG}" opacity="${(0.82 + r() * 0.18).toFixed(2)}" stroke="${BG}" stroke-width="10" stroke-linejoin="round"/>`;
  }
  const bw = P ? W * 0.62 : 980, bh = P ? 620 : 540, bx = P ? (W - bw) / 2 : W - bw - 110, by = P ? H * 0.745 : H - bh - 130;
  const inner = P ? lockup(W / 2, by + 70, W / 1000 * 1.05, "middle") : lockup(bx + bw / 2, by + 60, 1.05, "middle");
  return `<defs><linearGradient id="fur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB02E"/><stop offset=".55" stop-color="${AMBER}"/><stop offset="1" stop-color="${ORANGE}"/></linearGradient>
  <radialGradient id="shade" cx="50%" cy="40%" r="80%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2a0f00" stop-opacity=".45"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#fur)"/>${s}<rect width="${W}" height="${H}" fill="url(#shade)"/>
  <use href="#eyes" x="${(W - (P ? W * 0.6 : 900)) / 2}" y="${P ? H * 0.30 : H * 0.28}" width="${P ? W * 0.6 : 900}" height="${(P ? W * 0.6 : 900) * 185 / 610}"/>
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="48" fill="${BG}" opacity=".93"/>${inner}`;
}

// 3. Pawprint trail
function trail(f, W, H) {
  const P = f === "phone", r = rng(5); let paws = "", mist = "";
  const N = P ? 12 : 15;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const x = P ? W * (0.22 + 0.56 * (0.5 + 0.5 * Math.sin(t * 3.8))) : W * (0.06 + 0.88 * t);
    const y = P ? H * (0.76 - 0.50 * t) : H * (0.78 - 0.46 * t + 0.1 * Math.sin(t * 6));
    const t2 = (i + 1) / (N - 1);
    const x2 = P ? W * (0.22 + 0.56 * (0.5 + 0.5 * Math.sin(t2 * 3.8))) : W * (0.06 + 0.88 * t2);
    const y2 = P ? H * (0.76 - 0.50 * t2) : H * (0.78 - 0.46 * t2 + 0.1 * Math.sin(t2 * 6));
    const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI + 90;
    const side = i % 2 ? 1 : -1, off = (P ? 46 : 52) * side;
    const px = x + off * Math.cos((ang) * Math.PI / 180), py = y + off * Math.sin(ang * Math.PI / 180);
    const sz = (P ? 125 : 190) * (0.75 + 0.5 * t);
    paws += `<use href="#paw" x="${(px - sz / 2).toFixed(0)}" y="${(py - sz / 2).toFixed(0)}" width="${sz.toFixed(0)}" height="${sz.toFixed(0)}" transform="rotate(${ang.toFixed(1)} ${px.toFixed(0)} ${py.toFixed(0)})" opacity="${(0.18 + 0.82 * Math.pow(t, 1.3)).toFixed(2)}"/>`;
  }
  for (let i = 0; i < 7; i++) mist += `<ellipse cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" rx="${(W * (0.25 + r() * 0.3)).toFixed(0)}" ry="${(H * (0.05 + r() * 0.06)).toFixed(0)}" fill="#cfe6d6" opacity="${(0.025 + r() * 0.04).toFixed(3)}" filter="url(#mb)"/>`;
  return `<defs><linearGradient id="bgt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16301f"/><stop offset=".6" stop-color="#0c1a11"/><stop offset="1" stop-color="#060b07"/></linearGradient><filter id="mb" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="${P ? 60 : 80}"/></filter></defs>
  <rect width="${W}" height="${H}" fill="url(#bgt)"/>${mist}${paws}
  <text x="${P ? W / 2 : 150}" y="${P ? H * 0.115 + 130 : 330}" text-anchor="${P ? "middle" : "start"}" font-family="${FONT}" font-weight="900" font-size="${P ? 92 : 120}" fill="${TEXT}" ${P ? "" : ""}>Every paw print</text>
  <text x="${P ? W / 2 : 150}" y="${P ? H * 0.115 + 250 : 460}" text-anchor="${P ? "middle" : "start"}" font-family="${FONT}" font-weight="900" font-size="${P ? 92 : 120}" fill="url(#wg)">counts.</text>
  ${P ? lockup(W / 2, H * 0.82, W / 1000 * 1.25, "middle") : lockup(W - 150, 150, 1.2, "end")}`;
}

// 4. The number
function number(f, W, H) {
  const P = f === "phone";
  const cx = W / 2, y0 = P ? H * 0.30 : H * 0.30, big = P ? 400 : 520;
  const data = [[2006, 1411], [2010, 1706], [2014, 2226], [2018, 2967], [2022, 3682]];
  const gx = P ? W * 0.12 : W * 0.28, gw = P ? W * 0.76 : W * 0.44, gy = P ? H * 0.60 : H * 0.70, gh = P ? 330 : 300;
  const pts = data.map(([yr, v], i) => [gx + gw * i / 4, gy + gh - gh * (v - 1000) / 2800, yr, v]);
  const line = pts.map(p => p[0].toFixed(0) + "," + p[1].toFixed(0)).join(" ");
  const dots = pts.map(p => `<circle cx="${p[0].toFixed(0)}" cy="${p[1].toFixed(0)}" r="${P ? 13 : 12}" fill="${AMBER}"/><text x="${p[0].toFixed(0)}" y="${(gy + gh + (P ? 80 : 70))}" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="${P ? 34 : 32}" fill="${MUTED}">${p[2]}</text>`).join("");
  const lbl = `<text x="${pts[0][0]}" y="${pts[0][1] - 34}" text-anchor="start" font-family="${FONT}" font-weight="800" font-size="${P ? 38 : 36}" fill="${TEXT}">1,411</text><text x="${pts[4][0]}" y="${pts[4][1] - 34}" text-anchor="end" font-family="${FONT}" font-weight="800" font-size="${P ? 38 : 36}" fill="${TEXT}">3,682</text>`;
  return `<defs><radialGradient id="g4" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#1a3523"/><stop offset="1" stop-color="#070d09"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g4)"/>
  <use href="#paw" x="${W * (P ? 0.52 : 0.62)}" y="${H * (P ? 0.04 : 0.02)}" width="${P ? 1000 : 1300}" height="${P ? 1000 : 1300}" opacity=".05" transform="rotate(18 ${W * 0.8} ${H * 0.3})"/>
  <text x="${cx}" y="${y0 - (P ? 200 : 260)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${P ? 42 : 44}" letter-spacing="${P ? 12 : 14}" fill="${AMBER}">ESTIMATED WILD TIGERS IN INDIA</text>
  <text x="${cx}" y="${y0 + big * 0.62}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${big}" letter-spacing="-8" fill="url(#wg)">3,682</text>
  <text x="${cx}" y="${y0 + big * 0.62 + (P ? 110 : 120)}" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="${P ? 50 : 52}" fill="${TEXT}">+161% since 2006 · All India Tiger Estimation 2022</text>
  <text x="${cx}" y="${y0 + big * 0.62 + (P ? 175 : 190)}" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="${P ? 42 : 40}" fill="${MUTED}">Statistical range 3,167 to 3,925 · fragile, uneven recovery</text>
  <polyline points="${line}" fill="none" stroke="${AMBER}" stroke-width="${P ? 8 : 8}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>${dots}${lbl}
  ${P ? lockup(W / 2, H * 0.80, W / 1000 * 1.25, "middle") : lockup(W - 150, H - 330, 1.2, "end")}`;
}

// 5. Forest dusk
function forest(f, W, H) {
  const P = f === "phone", r = rng(33); let layers = "";
  const cols = ["#3a2a12", "#24301a", "#16261a", "#0d1a11", "#070d09"];
  const hor = H * (P ? 0.66 : 0.64);
  for (let L = 0; L < 5; L++) {
    const base = hor - (P ? 150 : 100) + L * (P ? 120 : 90), amp = (P ? 70 : 60) + L * 8;
    let d = `M0 ${H} L0 ${base}`;
    for (let x = 0; x <= W; x += 40) d += ` L${x} ${(base + amp * Math.sin(x * 0.0035 + L * 2) + amp * 0.4 * Math.sin(x * 0.011 + L)).toFixed(0)}`;
    d += ` L${W} ${H}Z`;
    let trees = "";
    const cnt = Math.round(W / (P ? 46 : 60) * (1 + L * 0.3));
    for (let i = 0; i < cnt; i++) {
      const x = r() * W, yb = base + amp * Math.sin(x * 0.0035 + L * 2) + amp * 0.4 * Math.sin(x * 0.011 + L);
      const h = (P ? 120 : 130) * (0.7 + r() * 0.9) * (1 + L * 0.35), w = h * (0.22 + r() * 0.1);
      trees += `<rect x="${(x - 5).toFixed(0)}" y="${(yb - h * 0.6).toFixed(0)}" width="10" height="${(h * 0.7).toFixed(0)}"/><ellipse cx="${x.toFixed(0)}" cy="${(yb - h * 0.75).toFixed(0)}" rx="${(w).toFixed(0)}" ry="${(h * 0.38).toFixed(0)}"/>`;
    }
    layers += `<g fill="${cols[L]}"><path d="${d}"/>${trees}</g>`;
    if (L < 3) layers += `<rect x="0" y="${base - 40}" width="${W}" height="${P ? 260 : 200}" fill="url(#mist)" opacity="${0.5 - L * 0.1}"/>`;
  }
  let stars = ""; for (let i = 0; i < 80; i++) stars += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * hor * 0.6).toFixed(0)}" r="${(1 + r() * 2.5).toFixed(1)}" fill="#fff" opacity="${(0.2 + r() * 0.5).toFixed(2)}"/>`;
  const ew = P ? W * 0.34 : 520, eh = ew * 185 / 610;
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07110b"/><stop offset=".55" stop-color="#27381f"/><stop offset=".85" stop-color="#b8601a"/><stop offset="1" stop-color="${AMBER}"/></linearGradient>
  <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9b86a" stop-opacity="0"/><stop offset=".5" stop-color="#e9b86a" stop-opacity=".35"/><stop offset="1" stop-color="#e9b86a" stop-opacity="0"/></linearGradient>
  <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE2A8"/><stop offset=".35" stop-color="#FFB02E"/><stop offset="1" stop-color="${AMBER}" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}
  <circle cx="${W * 0.5}" cy="${hor - (P ? 80 : 50)}" r="${P ? 520 : 520}" fill="url(#sun)" opacity=".85"/>
  ${layers}
  <use href="#eyes" x="${W * (P ? 0.50 : 0.72) - ew / 2}" y="${H * (P ? 0.905 : 0.88)}" width="${ew}" height="${eh}" opacity=".95"/>
  ${P ? lockup(W / 2, H * 0.09, W / 1000 * 1.25, "middle") : lockup(150, 140, 1.2, "start")}
  <text x="${P ? W / 2 : 150}" y="${P ? H * 0.09 + 520 : 140 + 350}" text-anchor="${P ? "middle" : "start"}" font-family="${FONT}" font-weight="600" font-size="${P ? 44 : 44}" fill="${TEXT}" opacity=".9">Keep the forests alive.</text>`;
}

const DESIGNS = [["01-eyes-in-the-dark", eyes], ["02-stripes", stripes], ["03-paw-trail", trail], ["04-the-number", number], ["05-forest-dusk", forest]];
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
