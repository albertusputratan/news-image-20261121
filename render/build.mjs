import { readFile, writeFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const PAGE = 1024;
const M = 16;
const INNER = PAGE - 2 * M;

const news = JSON.parse(await readFile(join(root, "news.json"), "utf8"));
const byId = new Map(news.stories.map((s) => [s.id, s]));
const regionById = new Map(news.regions.map((r) => [r.id, r]));

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (news.stories.length !== 49) fail(`expected 49 stories, got ${news.stories.length}`);
for (let i = 1; i <= 49; i++) if (!byId.has(i)) fail(`missing story ${i}`);
const counted = {};
for (const s of news.stories) counted[s.region] = (counted[s.region] || 0) + 1;
for (const r of news.regions) {
  if (counted[r.id] !== r.count) fail(`${r.id} count ${counted[r.id]} != ${r.count}`);
}
if (news.regions.reduce((s, r) => s + r.count, 0) !== 49) fail("region bar does not sum to 49");

const yKicker = 16;
const hKicker = 13;
const yDate = 30;
const hDate = 50;
const yKpi = 82;
const hKpi = 20;
const yUtc = 104;
const hUtc = 30;
const yRegion = 136;
const hRegion = 16;
const yLead = 156;
const hLead = 240;
const yMid = 400;
const hMid = 108;
const midGap = 5;
const midEnd = yMid + hMid * 2 + midGap;
const yLower = midEnd + 5;
const yFooter = 994;
const hFooter = 14;
if (yFooter + hFooter !== 1008) fail("footer does not sit on the 16px bottom margin");

const leadW = 242;
const leadG = 8;
const midW = 192;
const midG = 8;
const mapW = 360;
const mapH = 136;
const colG = 8;
const briefsW = INNER - mapW - 8;
const colW = (briefsW - 2 * colG) / 3;

const LAT_MAX = 78;
const LAT_SPAN = (mapH / mapW) * 360;
const LAT_MIN = LAT_MAX - LAT_SPAN;

function project(lon, lat) {
  return [((lon + 180) / 360) * mapW, ((LAT_MAX - lat) / LAT_SPAN) * mapH];
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function countLines(text, maxChars) {
  const limit = Math.max(8, maxChars);
  const words = String(text).split(/\s+/).filter(Boolean);
  let lines = 1;
  let col = 0;
  for (const word of words) {
    if (col === 0) {
      col = word.length;
      if (word.length > limit) lines += Math.ceil(word.length / limit) - 1;
    } else if (col + 1 + word.length <= limit) col += 1 + word.length;
    else {
      lines += 1;
      col = word.length;
    }
  }
  return lines;
}

function fontFace(family, file, weight, style) {
  const b64 = readFileSync(file).toString("base64");
  return `@font-face{font-family:"${family}";src:url(data:font/ttf;base64,${b64}) format("truetype");font-weight:${weight};font-style:${style};font-display:block;}`;
}

const fontCss = [
  fontFace("Playfair Display", "/usr/share/fonts/truetype/sand-box/google/Playfair Display/PlayfairDisplay-VariableFont_wght.ttf", "400 900", "normal"),
  fontFace("Inter", "/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf", "100 900", "normal"),
  fontFace("Source Serif Pro", "/usr/share/fonts/truetype/sand-box/custom/Source Serif Pro/SourceSerifPro-Regular.ttf", "400", "normal"),
  fontFace("Source Serif Pro", "/usr/share/fonts/truetype/sand-box/custom/Source Serif Pro/SourceSerifPro-Bold.ttf", "700", "normal"),
  fontFace("Source Serif Pro", "/usr/share/fonts/truetype/sand-box/custom/Source Serif Pro/SourceSerifPro-It.ttf", "400", "italic"),
].join("");

function segWidths() {
  const widths = news.regions.map((r) => Math.floor((INNER * r.count) / 49));
  let used = widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] += INNER - used;
  if (widths[widths.length - 1] < 54) {
    const need = 54 - widths[widths.length - 1];
    widths[widths.length - 1] = 54;
    widths[0] -= need;
  }
  if (widths.reduce((a, b) => a + b, 0) !== INNER) fail("region bar width drift");
  return widths;
}

const dcText = `${news.dateCheck.intro} ${news.dateCheck.items.join("; ")}. ${news.dateCheck.notYet}`;
const dcFont = 7.6;
const dcInnerW = INNER - 16;
const dcChars = Math.floor(dcInnerW / (dcFont * 0.46));
const dcLines = countLines(dcText, dcChars);
const dcTitleH = 22;
const dcPad = 5;
const dcLineH = 9.4;
const dcH = dcTitleH + dcPad * 2 + dcLines * dcLineH;
const dcY = yFooter - 4 - dcH;
const lowerH = dcY - 4 - yLower;
const briefAreaH = lowerH - 16;
if (lowerH < 230) fail(`lower band ${lowerH}px is too short for the map and briefs`);
if (yLower + lowerH + 4 > dcY) fail("briefs collide with DATE CHECK");
if (dcY - (yLower + lowerH) < 3) fail("need >= 3px between briefs and DATE CHECK");

function columnHeight(regionIds, fontPx) {
  const lineH = fontPx + 1.9;
  const headH = 12;
  const chars = Math.floor((colW - 8) / (fontPx * 0.505));
  let h = 0;
  for (const rid of regionIds) {
    h += headH;
    for (const s of news.stories) {
      if (s.role !== "brief" || s.region !== rid) continue;
      const text = `${s.id} ${s.line} ${s.source} · ${s.tag}`;
      h += countLines(text, chars) * lineH;
    }
  }
  return h;
}

let briefFont = 8;
while (briefFont >= 7 && news.briefColumns.some((col) => columnHeight(col, briefFont) > briefAreaH - 1)) {
  briefFont -= 0.25;
}
if (briefFont < 7) {
  for (const col of news.briefColumns) {
    console.error(col.join("+"), columnHeight(col, 7).toFixed(1), ">", briefAreaH);
  }
  fail("briefs do not fit above DATE CHECK");
}
const briefLineH = briefFont + 1.9;

const LAND = [
  [[-168, 71], [-164, 67], [-166, 63], [-160, 61], [-153, 59], [-146, 60], [-140, 59], [-136, 57], [-130, 54], [-126, 49], [-124, 45], [-124, 40], [-122, 36], [-117, 32.5], [-114, 31], [-110, 24], [-105, 21], [-97, 16], [-91, 14], [-87, 13], [-83, 8.5], [-79, 8], [-81, 9], [-87, 13.5], [-91, 17], [-97, 20], [-97, 26], [-97, 28.5], [-93, 29.5], [-90, 29], [-88, 30.5], [-84, 30], [-82, 26], [-80, 25], [-81, 31], [-77, 34], [-75, 35.5], [-74, 39], [-72, 41], [-70, 42], [-67, 44.5], [-67, 47], [-60, 47], [-64, 50], [-56, 52], [-62, 58], [-64, 60], [-72, 62], [-80, 63], [-88, 64], [-96, 66], [-108, 69], [-128, 70], [-140, 70], [-156, 71], [-166, 72], [-168, 71]],
  [[-73, 77.5], [-60, 76], [-48, 70], [-43, 66], [-44, 60.5], [-52, 64], [-62, 68], [-70, 74], [-73, 77.5]],
  [[-77, 8], [-71, 12], [-67, 11], [-62, 8.5], [-60, 6], [-54, 2], [-50, 0], [-45, -2], [-38, -5], [-35, -7], [-35, -10], [-39, -16], [-40, -20], [-43, -23], [-48, -28], [-50, -31], [-53, -34], [-58, -38], [-62, -40], [-65, -43], [-68, -47], [-71, -52], [-74, -52], [-73, -46], [-71, -38], [-72, -30], [-71, -18], [-75, -14], [-77, -12], [-79, -6], [-80, -2], [-78, 1], [-78, 6], [-77, 8]],
  [[-9.5, 37], [-8.9, 40], [-8.8, 43.4], [-4, 43.5], [-1.6, 46], [-4.6, 48], [-1.8, 49.4], [1.6, 51], [4.4, 52.4], [8, 55.5], [10.4, 57.6], [12, 56], [11.4, 59], [12.4, 62], [15, 66], [18, 69.2], [25, 71], [32, 70], [44, 68], [60, 69.5], [80, 73], [104, 76], [130, 73], [156, 70], [170, 66], [178, 66], [170, 63], [162, 60], [156, 52], [142, 46], [132, 43], [128, 35], [122, 37], [121, 31], [120, 26], [114, 22.5], [109, 20], [109, 13], [106, 10], [104, 1.5], [100, 7], [98, 13], [92, 20], [88, 22], [80, 16], [77.4, 8], [76, 10], [73, 15], [72.6, 21], [69, 23.5], [66, 25], [62, 25], [57, 26.5], [58, 24], [57, 22], [52, 16], [44, 12.6], [43, 16], [39, 22], [35, 28], [34.5, 31.2], [32, 31.4], [36, 36.2], [29, 36.4], [26, 36.6], [23, 38], [20, 39.6], [18, 40.4], [15.2, 38], [12.4, 42], [10, 44], [7.5, 43.6], [3, 42.6], [-0.4, 42.8], [-5.4, 36.2], [-9.5, 37]],
  [[-5.4, 50], [-5.2, 52], [-3.2, 54.5], [-2, 56], [-3.2, 58.5], [-5, 58.4], [-6.2, 56.5], [-5.2, 54.6], [-4.6, 52.6], [-5.3, 50.2], [-4, 50.2], [-5.4, 50]],
  [[-10.2, 51.8], [-9.6, 53.4], [-8.2, 54.6], [-6.2, 55.2], [-6, 54], [-8, 52.6], [-9.6, 51.6], [-10.2, 51.8]],
  [[-17, 21], [-16, 26], [-10, 32], [-6, 35.5], [-2, 35.5], [8, 37], [10, 33], [11, 30], [25, 32], [32, 31], [34, 28], [43, 12.2], [51, 12], [51, 10], [44, 2], [41, -2], [42, -10], [39, -15], [35, -20], [32, -26], [28, -33], [20, -34.8], [18, -32], [14, -22], [12, -6], [9, 4], [10, 6], [-5, 5], [-8, 4], [-16, 12], [-17, 15], [-16, 21], [-17, 21]],
  [[43.2, -12], [50.2, -15], [47.4, -25.4], [43.6, -25], [43.2, -16], [43.2, -12]],
  [[129, 34], [132, 34], [136, 35], [140, 35.5], [141, 38], [141, 41], [145, 43.5], [141, 45], [140, 42], [139, 38], [136, 36], [132, 34], [130, 32], [131, 34], [129, 34]],
  [[124, 12], [126, 14], [126, 18], [122, 18], [120, 14], [120, 8], [122, 6], [125.5, 6.2], [126.4, 8], [124, 12]],
  [[95, 5.5], [102, 2], [108, -1], [114, -3], [119, -4], [122, -8], [114, -8.5], [106, -6], [102, -2], [95, 2], [95, 5.5]],
  [[108.5, 1.5], [114, 1], [119, 5], [117, 7], [111, 2], [108.5, 1.5]],
  [[131, -1], [141, -2], [147, -6], [146, -10], [141, -8], [134, -8], [131, -3], [131, -1]],
  [[113, -22], [114, -28], [115, -34], [122, -34], [130, -32], [136, -35], [141, -38], [147, -38], [150, -37], [153.5, -27], [146, -18], [143, -11], [136, -12], [128, -14], [124, -16], [114, -21], [113, -22]],
  [[166, -46], [170, -46], [174, -41], [178, -37], [175, -39], [172, -41], [167, -46]],
  [[80, 9.5], [81.8, 8], [81.6, 6], [80, 6], [79.6, 8], [80, 9.5]],
];

function landPath() {
  return LAND.map((ring) => ring.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join("") + "Z").join("");
}

function clusterPins(pins, radius) {
  const parent = pins.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < pins.length; i++) {
    for (let j = i + 1; j < pins.length; j++) {
      const dx = pins[i].x - pins[j].x;
      const dy = pins[i].y - pins[j].y;
      if (dx * dx + dy * dy <= radius * radius) parent[find(i)] = find(j);
    }
  }
  const groups = new Map();
  pins.forEach((p, i) => {
    const k = find(i);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  });
  return [...groups.values()];
}

function overlaps(a, b) {
  return a.x < b.x + b.tw && a.x + a.tw > b.x && a.y > b.y - 9 && a.y - 9 < b.y;
}

function layoutLabels(groups) {
  const placed = [];
  const items = groups.map((g) => {
    const cx = g.reduce((s, p) => s + p.x, 0) / g.length;
    const cy = g.reduce((s, p) => s + p.y, 0) / g.length;
    const ids = [...new Set(g.map((p) => p.id))].sort((a, b) => a - b);
    const text = ids.join("·");
    const size = text.length > 16 ? 6.1 : 7;
    const tw = text.length * (size * 0.56) + 2;
    return { cx, cy, text, tw, size };
  }).sort((a, b) => b.tw - a.tw || a.cx - b.cx);
  const dirs = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
  for (const item of items) {
    let best = null;
    let bestScore = -1e9;
    for (const [dx, dy] of dirs) {
      for (const dist of [7, 12, 18, 26]) {
        let x = item.cx + dx * dist;
        let y = item.cy + dy * dist * 0.7;
        if (dx < 0) x -= item.tw;
        else if (dx === 0) x -= item.tw / 2;
        x = Math.max(1, Math.min(mapW - item.tw - 1, x));
        y = Math.max(8, Math.min(mapH - 2, y));
        const box = { x, y, tw: item.tw };
        let score = 50 - dist * 0.6;
        for (const q of placed) if (overlaps(box, q)) score -= 90;
        for (const p of pins) {
          if (p.x >= x - 1 && p.x <= x + item.tw + 1 && p.y <= y + 1 && p.y >= y - 8) score -= 8;
        }
        if (score > bestScore) bestScore = score, best = { ...item, x, y };
      }
    }
    placed.push(best);
  }
  return placed;
}

const pins = [];
for (const s of news.stories) {
  for (const p of s.pins || []) {
    const [x, y] = project(p.lon, p.lat);
    if (x < -2 || x > mapW + 2 || y < -2 || y > mapH + 2) fail(`pin ${s.id} falls outside the map`);
    pins.push({ id: s.id, x, y, color: regionById.get(s.region).color, role: s.role });
  }
}
const labels = layoutLabels(clusterPins(pins, 5));

function mapSvg() {
  const seas = [
    [-40, 28, "ATLANTIC"],
    [-28, -28, "ATLANTIC"],
    [-150, 8, "PACIFIC"],
    [-120, -30, "PACIFIC"],
    [78, -20, "INDIAN"],
  ];
  const seaText = seas.map(([lon, lat, name]) => {
    const [x, y] = project(lon, lat);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" fill="#8FB0C2" font-family="Inter,sans-serif" font-size="7.5" font-weight="700" letter-spacing="0.14em">${name}</text>`;
  }).join("");
  const dots = pins.map((p) => {
    const r = p.role === "lead" ? 4.2 : p.role === "mid" ? 3.3 : 2.5;
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${p.color}" stroke="#F4EFE4" stroke-width="0.8"/>`;
  }).join("");
  const leaders = labels.map((lb) => {
    const dx = lb.x + lb.tw / 2 - lb.cx;
    const dy = lb.y - 4 - lb.cy;
    if (Math.hypot(dx, dy) < 9) return "";
    return `<line x1="${lb.cx.toFixed(1)}" y1="${lb.cy.toFixed(1)}" x2="${(lb.x + Math.min(8, lb.tw / 2)).toFixed(1)}" y2="${(lb.y - 3).toFixed(1)}" stroke="#1A140C" stroke-width="0.6" opacity="0.55"/>`;
  }).join("");
  const texts = labels.map((lb) => `<text x="${lb.x.toFixed(1)}" y="${lb.y.toFixed(1)}" fill="#1A140C" stroke="#F4EFE4" stroke-width="2.2" paint-order="stroke" font-family="Inter,sans-serif" font-size="${lb.size}" font-weight="700">${esc(lb.text)}</text>`).join("");
  const graticule = [];
  for (const lon of [-120, -60, 0, 60, 120]) {
    const [x] = project(lon, 0);
    graticule.push(`<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${mapH}" stroke="#C5D7E4" stroke-width="0.6"/>`);
  }
  for (const lat of [-40, 0, 40]) {
    const [, y] = project(0, lat);
    graticule.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${mapW}" y2="${y.toFixed(1)}" stroke="#C5D7E4" stroke-width="0.6"/>`);
  }
  return `<svg viewBox="0 0 ${mapW} ${mapH}" width="${mapW}" height="${mapH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${mapW}" height="${mapH}" fill="#D3E3EE"/>
    ${graticule.join("")}
    <path d="${landPath()}" fill="#1B3A4C" stroke="#0E2430" stroke-width="0.6" stroke-linejoin="round"/>
    ${seaText}${dots}${leaders}${texts}
  </svg>`;
}

function svg(w, h, body) {
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">${body}</svg>`;
}

function cop31() {
  return svg(242, 142, `
    <rect width="242" height="142" fill="#E6EDF5"/>
    <rect x="14" y="16" width="104" height="112" fill="#FFFCF7" stroke="#1A140C" stroke-width="1.5"/>
    <rect x="26" y="30" width="78" height="8" fill="#1F4E89"/>
    <rect x="26" y="48" width="72" height="4" fill="#D0C8BA"/>
    <rect x="26" y="58" width="64" height="4" fill="#D0C8BA"/>
    <rect x="26" y="68" width="76" height="4" fill="#D0C8BA"/>
    <rect x="26" y="84" width="50" height="4" fill="#D0C8BA"/>
    <text x="26" y="114" font-family="Inter,sans-serif" font-size="14" font-weight="700" fill="#8E1C1C">3RD DRAFT</text>
    <circle cx="178" cy="50" r="34" fill="#FFFCF7" stroke="#1A140C" stroke-width="2"/>
    <circle cx="178" cy="50" r="2.6" fill="#1A140C"/>
    <line x1="178" y1="50" x2="178" y2="26" stroke="#1A140C" stroke-width="2.2"/>
    <line x1="178" y1="50" x2="200" y2="60" stroke="#8E1C1C" stroke-width="2.2"/>
    <path d="M152 28 A34 34 0 0 1 204 28" fill="none" stroke="#8E1C1C" stroke-width="3"/>
    <rect x="148" y="112" width="14" height="16" fill="#1F4E89"/>
    <rect x="166" y="100" width="14" height="28" fill="#1F4E89"/>
    <rect x="184" y="118" width="14" height="10" fill="#C4511A"/>
    <rect x="202" y="106" width="14" height="22" fill="#1F4E89"/>
    <line x1="144" y1="128" x2="220" y2="128" stroke="#1A140C" stroke-width="1.5"/>`);
}

function riyadh() {
  const stars = [[18, 14], [42, 26], [68, 12], [108, 20], [206, 16], [224, 34], [154, 10]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.15" fill="#F4EFE4"/>`).join("");
  return svg(242, 142, `
    <rect width="242" height="142" fill="#0E1C33"/>
    ${stars}
    <rect y="108" width="242" height="34" fill="#071018"/>
    <rect x="12" y="82" width="16" height="60" fill="#16324C"/>
    <rect x="34" y="68" width="28" height="74" fill="#1A3C5C"/>
    <rect x="68" y="90" width="14" height="52" fill="#12283E"/>
    <rect x="90" y="58" width="36" height="84" fill="#1E4668"/>
    <rect x="132" y="86" width="18" height="56" fill="#16324C"/>
    <rect x="156" y="96" width="34" height="46" fill="#12283E"/>
    <rect x="198" y="76" width="24" height="66" fill="#1A3C5C"/>
    <line x1="22" y1="8" x2="60" y2="48" stroke="#F3D48A" stroke-width="2"/>
    <circle cx="64" cy="52" r="7" fill="none" stroke="#E24B3A" stroke-width="2"/>
    <line x1="78" y1="6" x2="116" y2="48" stroke="#F3D48A" stroke-width="2"/>
    <circle cx="120" cy="52" r="7" fill="none" stroke="#E24B3A" stroke-width="2"/>
    <line x1="138" y1="12" x2="176" y2="46" stroke="#F3D48A" stroke-width="2"/>
    <circle cx="180" cy="50" r="7" fill="none" stroke="#E24B3A" stroke-width="2"/>
    <polygon points="204,94 222,98 204,102 211,98" fill="#D5DEE8"/>
    <line x1="214" y1="88" x2="224" y2="106" stroke="#E24B3A" stroke-width="1.6"/>`);
}

function quake() {
  return svg(242, 142, `
    <rect width="242" height="142" fill="#F3E6CF"/>
    <polygon points="0,98 46,44 88,94 126,36 170,100 208,56 242,92 242,142 0,142" fill="#8C5A3C"/>
    <polygon points="0,114 58,72 110,116 152,68 198,120 242,88 242,142 0,142" fill="#6B3F2A"/>
    <polyline points="8,124 32,124 42,102 54,138 66,112 78,124 108,124 120,96 132,140 146,110 160,124 188,124 200,106 214,130 226,116 236,124" fill="none" stroke="#FFFCF7" stroke-width="2.3"/>
    <circle cx="126" cy="70" r="9" fill="none" stroke="#8E1C1C" stroke-width="2"/>
    <circle cx="126" cy="70" r="2.5" fill="#8E1C1C"/>`);
}

function warsaw() {
  return svg(242, 142, `
    <rect width="242" height="142" fill="#F7F1E6"/>
    <rect width="88" height="71" fill="#FFFFFF"/>
    <rect y="71" width="88" height="71" fill="#DC143C"/>
    <circle cx="44" cy="36" r="16" fill="none" stroke="#1F4E89" stroke-width="2"/>
    <polygon points="44,22 47,36 44,50 41,36" fill="#1F4E89"/>
    <polygon points="28,36 44,33 60,36 44,39" fill="#1F4E89"/>
    <rect x="110" y="52" width="114" height="76" fill="#E7E0D4" stroke="#1A140C" stroke-width="1.5"/>
    <polygon points="102,52 167,16 232,52" fill="#1F4E89"/>
    <rect x="154" y="86" width="26" height="42" fill="#1F4E89"/>
    <rect x="124" y="66" width="16" height="14" fill="#FFFCF7" stroke="#1A140C"/>
    <rect x="148" y="66" width="16" height="14" fill="#FFFCF7" stroke="#1A140C"/>
    <rect x="186" y="66" width="16" height="14" fill="#FFFCF7" stroke="#1A140C"/>
    <rect x="208" y="66" width="14" height="14" fill="#FFFCF7" stroke="#1A140C"/>`);
}

function midArt(id) {
  const w = 192;
  const h = 56;
  const common = {
    5: `<rect width="192" height="56" fill="#0E1C33"/>
      <path d="M14 40 l10 -6 l8 6 l-8 4 z M40 28 l10 -6 l8 6 l-8 4 z M66 38 l10 -6 l8 6 l-8 4 z M34 16 l22 8 M70 14 l24 10 M96 18 l18 8" fill="#D5DEE8" stroke="#F3D48A" stroke-width="1.2"/>
      <text x="168" y="38" text-anchor="end" fill="#F4EFE4" font-family="Playfair Display,serif" font-size="26" font-weight="700">148</text>`,
    8: `<rect width="192" height="56" fill="#E7EEF6"/>
      <rect x="16" y="18" width="16" height="28" fill="#1F4E89"/><rect x="36" y="10" width="16" height="36" fill="#1F4E89"/><rect x="56" y="22" width="16" height="24" fill="#1F4E89"/>
      <circle cx="112" cy="28" r="16" fill="#FFFCF7" stroke="#1F4E89" stroke-width="2"/>
      <text x="112" y="34" text-anchor="middle" fill="#1F4E89" font-family="Inter,sans-serif" font-size="16" font-weight="700">€</text>
      <rect x="140" y="30" width="14" height="16" fill="#8E1C1C"/><rect x="158" y="22" width="14" height="24" fill="#C4511A"/>
      <path d="M142 18 l16 8" stroke="#8E1C1C" stroke-width="2"/>`,
    7: `<rect width="192" height="56" fill="#F4EFE6"/>
      <rect x="18" y="14" width="46" height="32" fill="#FFFCF7" stroke="#1A140C" stroke-width="1.3"/>
      <path d="M28 24 h28 M28 32 h22 M28 40 h16" stroke="#C8BEB0" stroke-width="2"/>
      <path d="M78 40 h28 l8 -22 h16" fill="none" stroke="#1A140C" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="132" cy="16" r="5" fill="#1A140C"/>
      <text x="168" y="40" text-anchor="middle" fill="#8E1C1C" font-family="Inter,sans-serif" font-size="28" font-weight="800">X</text>`,
    13: `<rect width="192" height="56" fill="#E5F1F7"/>
      <path d="M16 34 h70 l16 -10 h28 l8 10 h18" fill="none" stroke="#1A140C" stroke-width="2"/>
      <path d="M48 34 l18 -16 h22 l-8 16 z" fill="#1B3A4C"/>
      <circle cx="46" cy="36" r="4" fill="#1A140C"/><circle cx="128" cy="36" r="4" fill="#1A140C"/>
      <text x="178" y="26" text-anchor="end" fill="#1B3A4C" font-family="Playfair Display,serif" font-size="22" font-weight="700">146</text>`,
    25: `<rect width="192" height="56" fill="#F8E4DC"/>
      <rect x="28" y="10" width="22" height="34" rx="3" fill="#FFFCF7" stroke="#1A140C" stroke-width="1.4"/>
      <rect x="32" y="16" width="14" height="16" fill="#C4511A"/>
      <rect x="78" y="12" width="28" height="28" fill="#8E1C1C"/>
      <rect x="89" y="16" width="6" height="20" fill="#FFFCF7"/><rect x="82" y="23" width="20" height="6" fill="#FFFCF7"/>
      <text x="168" y="40" text-anchor="end" fill="#8E1C1C" font-family="Playfair Display,serif" font-size="28" font-weight="700">11</text>`,
    26: `<rect width="192" height="56" fill="#F3EBDD"/>
      <polygon points="16,34 40,16 64,34" fill="#1B3A4C"/><rect x="22" y="34" width="36" height="14" fill="#1B3A4C"/>
      <polygon points="70,36 96,18 122,36" fill="#6E3A8A"/><rect x="78" y="36" width="36" height="12" fill="#6E3A8A"/>
      <rect x="136" y="20" width="40" height="26" fill="#FFFCF7" stroke="#8E1C1C" stroke-width="2"/>
      <line x1="136" y1="33" x2="176" y2="33" stroke="#8E1C1C" stroke-width="2"/>`,
    14: `<rect width="192" height="56" fill="#E5F2E4"/>
      <rect x="28" y="12" width="4" height="30" fill="#1A140C"/><rect x="40" y="8" width="4" height="34" fill="#1A140C"/><rect x="52" y="12" width="4" height="30" fill="#1A140C"/>
      <rect x="24" y="40" width="36" height="4" fill="#C4511A"/>
      <circle cx="96" cy="24" r="8" fill="#8E1C1C"/>
      <text x="178" y="38" text-anchor="end" fill="#1F7A4D" font-family="Playfair Display,serif" font-size="22" font-weight="700">486-4</text>`,
    46: `<rect width="192" height="56" fill="#071422"/>
      <circle cx="46" cy="28" r="18" fill="#C47B45"/>
      <circle cx="40" cy="24" r="4" fill="#A86434"/><circle cx="54" cy="32" r="3" fill="#A86434"/>
      <path d="M78 36 q30 -28 70 -8" fill="none" stroke="#F3D48A" stroke-width="2"/>
      <polygon points="148,22 168,28 148,34 154,28" fill="#F4EFE4"/>`,
    49: `<rect width="192" height="56" fill="#E7F0E4"/>
      <path d="M28 44 V14 M18 14 h20 M70 44 V14 M60 14 h20" stroke="#1A140C" stroke-width="3"/>
      <ellipse cx="112" cy="30" rx="14" ry="9" fill="#F4EFE4" stroke="#1A140C" stroke-width="1.6" transform="rotate(-28 112 30)"/>
      <text x="180" y="36" text-anchor="end" fill="#1F4E89" font-family="Playfair Display,serif" font-size="20" font-weight="700">37-12</text>`,
    34: `<rect width="192" height="56" fill="#161616"/>
      <path d="M16 34 h46 l10 -12 h28 l8 12 h36" fill="#F4EFE4"/>
      <circle cx="36" cy="38" r="6" fill="#1A140C"/><circle cx="118" cy="38" r="6" fill="#1A140C"/>
      <text x="176" y="24" text-anchor="end" fill="#F4EFE4" font-family="Inter,sans-serif" font-size="12" font-weight="800">POLE</text>
      <text x="176" y="42" text-anchor="end" fill="#F3D48A" font-family="Inter,sans-serif" font-size="11" font-weight="700">1 VER</text>`,
  };
  return svg(w, h, common[id]);
}

const leadArt = { 1: cop31(), 2: riyadh(), 3: quake(), 4: warsaw() };
const tagClass = (tag) => tag.toLowerCase();

function card(story, x, y, w, h, artH) {
  const color = regionById.get(story.region).color;
  return `<article class="card" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
    <div class="art" style="height:${artH}px">${story.role === "lead" ? leadArt[story.id] : midArt(story.id)}</div>
    <div class="kick"><span class="badge" style="background:${color}">${story.id}</span><span>${esc(story.kicker)}</span></div>
    <h2>${esc(story.headline)}</h2>
    <p class="deck">${esc(story.deck)}</p>
    <div class="src"><span>${esc(story.source)}</span><b class="tag ${tagClass(story.tag)}">${esc(story.tag)}</b></div>
  </article>`;
}

const leads = news.leadOrder.map((id, i) => card(byId.get(id), M + i * (leadW + leadG), yLead, leadW, hLead, 142));
const mids = news.midOrder.map((id, i) => {
  const col = i % 5;
  const row = Math.floor(i / 5);
  return card(byId.get(id), M + col * (midW + midG), yMid + row * (hMid + midGap), midW, hMid, 56);
});

function briefColumn(regionIds, x) {
  const blocks = [];
  for (const rid of regionIds) {
    const region = regionById.get(rid);
    const items = news.stories.filter((s) => s.role === "brief" && s.region === rid);
    const rows = items.map((s) => `<p class="brief"><b class="bn" style="color:${region.color}">${s.id}</b> ${esc(s.line)} <span class="bs">${esc(s.source)}</span> <b class="tag ${tagClass(s.tag)}">${esc(s.tag)}</b></p>`).join("");
    blocks.push(`<h3 style="color:${region.color}">${esc(region.name.toUpperCase())}</h3>${rows}`);
  }
  return `<div class="bcol" style="left:${x}px;width:${colW}px">${blocks.join("")}</div>`;
}

const briefX0 = mapW + 8;
const briefCols = news.briefColumns.map((ids, i) => briefColumn(ids, briefX0 + i * (colW + colG))).join("");
const widths = segWidths();
let segX = M;
const segments = news.regions.map((r, i) => {
  const w = widths[i];
  const html = `<div class="seg" style="left:${segX}px;width:${w}px;background:${r.color}"><span>${esc(r.name)}</span><b>${r.count}</b></div>`;
  segX += w;
  return html;
}).join("");

const tickPad = 36;
const tickXs = news.ticks.map((_, i) => M + tickPad + (i / (news.ticks.length - 1)) * (INNER - 2 * tickPad));
const ticks = news.ticks.map((t, i) => `<div class="tick" style="left:${tickXs[i] - M}px"><b>${esc(t.time)}</b><span>${esc(t.place)}</span><i></i></div>`).join("");

const kpiGap = 4;
const kpiW = (INNER - kpiGap * (news.kpis.length - 1)) / news.kpis.length;
const kpis = news.kpis.map((k, i) => `<div class="kpi" style="left:${M + i * (kpiW + kpiGap)}px;width:${kpiW}px"><span>${esc(k.label)}</span><b>${esc(k.value)}</b></div>`).join("");

const notes = news.mapNotes.map((line) => `<p>${esc(line)}</p>`).join("");

const css = `
${fontCss}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:1024px;overflow:hidden;background:#F4EFE4}
.poster{position:relative;width:1024px;height:1024px;background:#F4EFE4;color:#1A140C;font-family:Inter,sans-serif}
.kicker,.date,.band,.card,.lower,.dc,.foot,.kpi,.tick,.seg{position:absolute}
.kicker{left:${M}px;top:${yKicker}px;width:${INNER}px;height:${hKicker}px;display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:650;letter-spacing:.06em;color:#3A3228}
.date{left:${M}px;top:${yDate}px;width:${INNER}px;height:${hDate}px;font-family:"Playfair Display","Source Serif Pro",serif;font-weight:700;font-size:44px;line-height:46px;letter-spacing:-.02em;color:#1A140C;white-space:nowrap}
.kpi{top:${yKpi}px;height:${hKpi}px;background:#FFFCF8;border:1px solid #C9BBA6;display:flex;align-items:center;justify-content:space-between;padding:0 6px;font-size:8px;color:#4A433A}
.kpi b{font-size:11px;font-weight:750;color:#1A140C;letter-spacing:-.02em}
.utc{position:absolute;left:${M}px;top:${yUtc}px;width:${INNER}px;height:${hUtc}px}
.tick{position:absolute;top:0;transform:translateX(-50%);text-align:center;white-space:nowrap;font-size:8px;line-height:10px;color:#1A140C}
.tick b{display:block;font-weight:750}
.tick span{display:block;color:#4A433A}
.tick i{display:block;width:1px;height:6px;background:#1A140C;margin:1px auto 0}
.utc .axis{position:absolute;left:0;right:0;bottom:0;height:1px;background:#1A140C}
.region{position:absolute;left:0;top:${yRegion}px;width:${PAGE}px;height:${hRegion}px}
.seg{top:0;height:${hRegion}px;display:flex;align-items:center;justify-content:space-between;padding:0 4px;color:#fff;font-size:8px;font-weight:650;white-space:nowrap}
.seg b{font-weight:750}
.card{background:#FFFCF8;border:1px solid #1C1915;overflow:hidden}
.art{overflow:hidden}
.art svg{display:block}
.card .kick{position:static;display:flex;align-items:center;gap:4px;height:12px;margin:1px 6px 0;font-size:8px;font-weight:700;letter-spacing:.04em;color:#3A3228}
.badge{display:inline-flex;align-items:center;justify-content:center;min-width:14px;height:12px;padding:0 2px;color:#fff;font-size:8px;font-weight:750}
.card h2{font-family:"Playfair Display","Source Serif Pro",serif;font-weight:700;color:#1A140C;margin:0 6px;font-size:18px;line-height:18px;height:36px}
.card .deck{margin:0 6px;color:#2A241C;font-family:"Source Serif Pro",serif;font-size:9px;line-height:10.5px;height:32px}
.card .src{margin:0 6px;height:12px;display:flex;justify-content:space-between;align-items:baseline;gap:4px;font-size:7.5px;color:#4A433A;white-space:nowrap}
.tag{font-weight:750;letter-spacing:.02em}
.tag.official,.tag.off{color:#1F4E89}
.tag.confirmed,.tag.conf{color:#1F7A4D}
.tag.reported,.tag.rep{color:#8A5A12}
.tag.claim{color:#9E1B1B}

.lower{left:${M}px;top:${yLower}px;width:${INNER}px;height:${lowerH}px;background:#FBF7F0;border:1px solid #1C1915}
.lower h2,.ahead{position:absolute;top:2px;height:14px;font-family:Inter,sans-serif;font-size:9px;font-weight:750;letter-spacing:.08em;color:#1A140C}
.mapbox{position:absolute;left:4px;top:16px;width:${mapW}px;height:${mapH}px}
.notes{position:absolute;left:6px;top:${18 + mapH}px;width:${mapW - 4}px;font-size:8px;line-height:10.5px;color:#2A241C}
.notes p{margin:0 0 3px}
.bcol{position:absolute;top:16px;height:${briefAreaH}px}
.bcol h3{font-size:8px;font-weight:750;letter-spacing:.06em;border-bottom:1px solid currentColor;margin:2px 0 1px;line-height:11px;height:12px}
.brief{font-size:${briefFont}px;line-height:${briefLineH}px;color:#1A140C}
.bn{font-weight:750;margin-right:2px}
.bs{color:#4A433A}
.dc{left:${M}px;top:${dcY}px;width:${INNER}px;height:${dcH}px;border:1.5px solid #8E1C1C;background:#FBF3F1}
.dc-title{height:${dcTitleH}px;background:#8E1C1C;color:#fff;font-family:Inter,sans-serif;font-size:14px;font-weight:800;letter-spacing:.12em;line-height:${dcTitleH}px;padding:0 8px}
.dc p{padding:${dcPad}px 8px 0;font-size:${dcFont}px;line-height:${dcLineH}px;color:#2A1212}
.dc strong{font-weight:750}
.foot{left:${M}px;top:${yFooter}px;width:${INNER}px;height:${hFooter}px;font-size:7.5px;line-height:${hFooter}px;color:#3A3228;white-space:nowrap;overflow:hidden}
`;

const midCss = `
.mids h2{font-size:12px;line-height:12px;height:12px}
.mids .deck{font-family:Inter,sans-serif;font-style:normal;font-size:8px;line-height:9px;height:18px}
.mids .kick{height:10px;margin-top:0}
.mids .src{height:10px}
`;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Saturday 21 November 2026</title>
<style>${css}${midCss}</style></head>
<body><div class="poster">
  <div class="kicker"><span>THE WORLD IN ONE DAY</span><span>${esc(news.masthead.countLine)}</span></div>
  <div class="date">${esc(news.masthead.date)}</div>
  ${kpis}
  <div class="utc">${ticks}<div class="axis"></div></div>
  <div class="region">${segments}</div>
  ${leads.join("")}
  <div class="mids">${mids.join("")}</div>
  <section class="lower">
    <h2 class="ahead" style="left:4px">WHERE IT HAPPENED</h2>
    <h2 class="ahead" style="left:${mapW + 12}px">ALSO ON SATURDAY 21 NOVEMBER</h2>
    <div class="mapbox">${mapSvg()}</div>
    <div class="notes">${notes}</div>
    ${briefCols}
  </section>
  <section class="dc"><div class="dc-title">${esc(news.dateCheck.title)}</div><p>${esc(news.dateCheck.intro)} ${news.dateCheck.items.map((item) => esc(item)).join("; ")}. <strong>${esc(news.dateCheck.notYet)}</strong></p></section>
  <div class="foot">${esc(news.footer)}</div>
</div></body></html>`;

const posterPath = join(here, "poster.html");
const shotPath = join(here, "shot.png");
const entryPath = join(root, "entry.png");
const previewPath = join(here, "preview-300.png");
await writeFile(posterPath, html);
console.log(`layout lower=${lowerH} dc=${dcH.toFixed(1)}@${dcY.toFixed(1)} briefFont=${briefFont} lines=${dcLines}`);

await execFileAsync("google-chrome", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--hide-scrollbars",
  "--window-size=1024,1024",
  `--screenshot=${shotPath}`,
  `file://${posterPath}`,
], { timeout: 90000, maxBuffer: 8 * 1024 * 1024 });

const py = `
from PIL import Image
import os, sys
im = Image.open(${JSON.stringify(shotPath)})
print("shot", im.size, im.mode)
if im.size != (1024, 1024):
    sys.exit("screenshot is %s" % (im.size,))
if im.mode == "RGBA":
    bg = Image.new("RGB", im.size, (244, 239, 228))
    bg.paste(im, mask=im.split()[-1])
    im = bg
else:
    im = im.convert("RGB")
im.save(${JSON.stringify(entryPath)}, "PNG", optimize=True)
if os.path.getsize(${JSON.stringify(entryPath)}) > 1024 * 1024:
    q = im.quantize(colors=192, method=Image.Quantize.MEDIANCUT).convert("RGB")
    q.save(${JSON.stringify(entryPath)}, "PNG", optimize=True)
    im = q
im.resize((300, 300), Image.Resampling.LANCZOS).save(${JSON.stringify(previewPath)}, "PNG", optimize=True)
print("entry", os.path.getsize(${JSON.stringify(entryPath)}))
`;
await execFileAsync("python3", ["-c", py], { timeout: 30000 });
await rm(shotPath, { force: true });
console.log("wrote", entryPath);
