/**
 * Saturday 21 November 2026 broadsheet.
 * Edit ../news.json, then run: node render/build.mjs
 */
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const news = JSON.parse(readFileSync(join(root, 'news.json'), 'utf8'));

const INK = '#16130f';
const PAPER = '#F5F0E6';
const RED = '#9e1b28';
const REGIONS = ['Europe', 'Middle East', 'Africa', 'South Asia', 'East Asia', 'Oceania', 'Americas', 'Global'];
const COLOUR = {
  Europe: '#1d4e89',
  'Middle East': '#9e1b28',
  Africa: '#2a6b45',
  'South Asia': '#a16207',
  'East Asia': '#0f6e78',
  Oceania: '#334e99',
  Americas: '#6a3d96',
  Global: '#3f3a34',
};

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function allStories() {
  return [...news.leads, ...news.features, ...news.briefs];
}

function validate() {
  const list = allStories();
  if (list.length !== 49) throw new Error(`expected 49 stories, got ${list.length}`);
  if (news.leads.length !== 4) throw new Error('need 4 leads');
  if (news.features.length !== 10) throw new Error('need 10 mid cards');
  if (news.date !== 'Saturday 21 November 2026') throw new Error('date');
  if (!news.countLine.startsWith('49 STORIES · 7 REGIONS')) throw new Error('count line');
  if (!news.dateCheck.notYet.includes('Not yet:')) throw new Error('not yet line');
  const ids = new Set();
  for (const story of list) {
    if (ids.has(story.n)) throw new Error(`duplicate ${story.n}`);
    ids.add(story.n);
    if (!REGIONS.includes(story.region)) throw new Error(`region on ${story.n}`);
    if (!story.source || !story.tag) throw new Error(`source/tag on ${story.n}`);
    if (!['OFFICIAL', 'CONFIRMED', 'REPORTED', 'CLAIM'].includes(story.tag)) {
      throw new Error(`bad tag on ${story.n}`);
    }
  }
  for (let n = 1; n <= 49; n += 1) {
    if (!ids.has(n)) throw new Error(`missing story ${n}`);
  }
}

function svg(vb, body) {
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
}

const ART = {
  cop: svg('0 0 320 160', `
    <rect width="320" height="160" fill="#e7e1d4"/>
    <rect x="0" y="118" width="320" height="42" fill="#cfc6b4"/>
    <g fill="#1d4e89">
      <rect x="28" y="78" width="22" height="40"/><rect x="58" y="70" width="22" height="48"/>
      <rect x="88" y="84" width="22" height="34"/><rect x="118" y="74" width="22" height="44"/>
      <rect x="148" y="88" width="22" height="30"/>
    </g>
    <rect x="196" y="36" width="92" height="70" fill="#f7f3ea" stroke="${INK}" stroke-width="2"/>
    <path d="M208 52 H276 M208 64 H268 M208 76 H250" stroke="${INK}" stroke-width="2"/>
    <circle cx="250" cy="28" r="16" fill="none" stroke="${RED}" stroke-width="3"/>
    <path d="M250 28 V18 M250 28 L258 32" stroke="${RED}" stroke-width="2"/>
  `),
  riyadh: svg('0 0 320 160', `
    <rect width="320" height="160" fill="#1c2a44"/>
    <rect y="118" width="320" height="42" fill="#141c2e"/>
    <g fill="#d9d0c0">
      <rect x="24" y="70" width="18" height="48"/><rect x="48" y="48" width="26" height="70"/>
      <rect x="80" y="78" width="16" height="40"/><rect x="102" y="40" width="22" height="78"/>
      <rect x="130" y="62" width="18" height="56"/>
    </g>
    <g fill="#8fd0ff">
      <rect x="54" y="58" width="6" height="4"/><rect x="108" y="52" width="6" height="4"/>
      <rect x="136" y="74" width="5" height="4"/>
    </g>
    <path d="M40 30 L150 78" stroke="${RED}" stroke-width="2"/>
    <path d="M210 18 L160 70" stroke="${RED}" stroke-width="2"/>
    <path d="M250 24 L190 84" stroke="#f2c14e" stroke-width="2"/>
    <circle cx="150" cy="78" r="3" fill="${RED}"/>
    <circle cx="160" cy="70" r="3" fill="${RED}"/>
    <circle cx="190" cy="84" r="3" fill="#f2c14e"/>
  `),
  quake: svg('0 0 320 160', `
    <rect width="320" height="160" fill="#efe4d2"/>
    <polygon points="0,120 70,48 130,120" fill="#b08968"/>
    <polygon points="90,120 170,36 250,120" fill="#8c6248"/>
    <polygon points="200,120 270,64 320,120" fill="#c4a484"/>
    <path d="M16 132 H70 L86 118 L100 140 L118 124 L140 136 H300" fill="none" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="168" cy="78" r="7" fill="${RED}"/>
    <circle cx="168" cy="78" r="14" fill="none" stroke="${RED}" stroke-width="2"/>
  `),
  nato: svg('0 0 320 160', `
    <rect width="320" height="160" fill="#e4eaf2"/>
    <rect x="70" y="78" width="180" height="16" fill="#243044"/>
    <rect x="148" y="46" width="24" height="34" fill="#243044"/>
    <rect x="40" y="28" width="4" height="90" fill="${INK}"/>
    <rect x="276" y="28" width="4" height="90" fill="${INK}"/>
    <rect x="18" y="28" width="36" height="24" fill="#f4f4f4" stroke="${INK}"/>
    <rect x="18" y="40" width="36" height="12" fill="${RED}"/>
    <rect x="266" y="28" width="36" height="24" fill="#1d4e89"/>
    <circle cx="160" cy="58" r="8" fill="none" stroke="#f4f4f4" stroke-width="2"/>
  `),
  drones: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#1b2838"/>
    <g fill="#d5dde8">
      <rect x="30" y="58" width="10" height="22"/><rect x="70" y="48" width="16" height="32"/>
      <rect x="230" y="52" width="14" height="28"/><rect x="270" y="60" width="12" height="20"/>
    </g>
    <g fill="none" stroke="#e8eef6" stroke-width="1.4">
      <path d="M40 20 h14 M47 13 v14"/><path d="M90 28 h12 M96 22 v12"/>
      <path d="M140 16 h16 M148 8 v16"/><path d="M190 24 h12 M196 18 v12"/>
      <path d="M250 14 h14 M257 7 v14"/>
    </g>
    <path d="M20 8 L120 40" stroke="${RED}" stroke-width="1.6"/>
    <path d="M300 6 L210 36" stroke="#f2c14e" stroke-width="1.6"/>
    <path d="M160 4 L150 30" stroke="#f2c14e" stroke-width="1.6"/>
  `),
  budget: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#e7eef6"/>
    <rect x="36" y="28" width="36" height="46" fill="#1d4e89"/>
    <rect x="84" y="40" width="36" height="34" fill="#9e1b28"/>
    <rect x="150" y="18" width="140" height="56" fill="#f7f3ea" stroke="${INK}" stroke-width="2"/>
    <text x="220" y="54" text-anchor="middle" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="${INK}">€</text>
  `),
  robots: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#efe8dc"/>
    <rect x="28" y="16" width="90" height="60" fill="#f7f3ea" stroke="${INK}" stroke-width="2"/>
    <path d="M40 32 H106 M40 44 H100 M40 56 H80" stroke="${INK}" stroke-width="2"/>
    <path d="M150 18 L210 70 M210 18 L150 70" stroke="${RED}" stroke-width="6"/>
    <rect x="230" y="28" width="18" height="28" fill="${INK}"/>
    <circle cx="239" cy="22" r="8" fill="${INK}"/>
    <path d="M248 40 H286" stroke="${INK}" stroke-width="4"/>
  `),
  plane: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#d9e7f2"/>
    <rect y="62" width="320" height="28" fill="#c5b89a"/>
    <path d="M36 58 H250" stroke="#f7f3ea" stroke-width="3" stroke-dasharray="10 8"/>
    <g fill="${INK}">
      <polygon points="70,52 210,46 214,54 70,56"/>
      <polygon points="120,48 150,28 158,30 140,50"/>
      <polygon points="150,52 190,70 170,70 140,54"/>
    </g>
    <text x="262" y="40" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="${INK}">146</text>
  `),
  liquor: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#f3ead8"/>
    <rect x="36" y="28" width="16" height="40" rx="2" fill="#1d4e89"/>
    <rect x="60" y="34" width="14" height="34" rx="2" fill="#1d4e89"/>
    <rect x="82" y="24" width="16" height="44" rx="2" fill="#9e1b28"/>
    <polygon points="150,18 178,70 122,70" fill="none" stroke="${RED}" stroke-width="4"/>
    <rect x="146" y="38" width="8" height="16" fill="${RED}"/>
    <rect x="200" y="30" width="80" height="40" fill="#f7f3ea" stroke="${INK}" stroke-width="2"/>
    <path d="M236 30 V70 M216 50 H264" stroke="${RED}" stroke-width="3"/>
  `),
  factory: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#e7e2d6"/>
    <polygon points="20,70 20,40 50,28 80,40 80,70" fill="#243044"/>
    <polygon points="80,70 80,36 110,24 140,36 140,70" fill="#34506a"/>
    <rect x="150" y="34" width="70" height="36" fill="#243044"/>
    <rect x="230" y="22" width="10" height="48" fill="#6a6258"/>
    <circle cx="250" cy="48" r="6" fill="${INK}"/>
    <rect x="244" y="54" width="12" height="16" fill="${INK}"/>
    <circle cx="274" cy="50" r="6" fill="${RED}"/>
    <rect x="268" y="56" width="12" height="14" fill="${RED}"/>
  `),
  cricket: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#e5f0df"/>
    <ellipse cx="160" cy="70" rx="120" ry="16" fill="#c9d8b0" stroke="${INK}" stroke-width="1.5"/>
    <rect x="250" y="28" width="4" height="28" fill="${INK}"/>
    <rect x="262" y="28" width="4" height="28" fill="${INK}"/>
    <rect x="246" y="26" width="24" height="4" fill="${INK}"/>
    <rect x="40" y="22" width="90" height="40" fill="#16324f"/>
    <text x="85" y="48" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#f5f0e6">486-4</text>
  `),
  mercury: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#101820"/>
    <circle cx="210" cy="46" r="30" fill="#b7aea2"/>
    <circle cx="198" cy="38" r="6" fill="#8d857c"/>
    <circle cx="222" cy="52" r="4" fill="#8d857c"/>
    <rect x="48" y="40" width="28" height="12" fill="#d9e2ea"/>
    <rect x="74" y="42" width="22" height="8" fill="#9fb4c6"/>
    <path d="M96 46 H150" stroke="#f2c14e" stroke-width="2"/>
  `),
  rugby: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#e7f2e4"/>
    <rect x="70" y="20" width="6" height="56" fill="${INK}"/>
    <rect x="108" y="20" width="6" height="56" fill="${INK}"/>
    <rect x="58" y="20" width="68" height="5" fill="${INK}"/>
    <ellipse cx="210" cy="48" rx="28" ry="16" fill="#f7f3ea" stroke="${INK}" stroke-width="2"/>
    <text x="250" y="54" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="${INK}">37-12</text>
  `),
  grid: svg('0 0 320 90', `
    <rect width="320" height="90" fill="#2a2e34"/>
    <path d="M0 68 H320" stroke="#f2f2f2" stroke-width="3" stroke-dasharray="14 10"/>
    <g fill="#d0d5dc">
      <rect x="36" y="40" width="46" height="12" rx="3"/>
      <rect x="48" y="36" width="16" height="6"/>
      <circle cx="46" cy="54" r="4"/><circle cx="72" cy="54" r="4"/>
    </g>
    <text x="120" y="50" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#f5f0e6">POLE</text>
    <text x="196" y="36" font-family="Inter, sans-serif" font-size="11" fill="#f5f0e6">1 VER</text>
    <text x="196" y="52" font-family="Inter, sans-serif" font-size="11" fill="#f5f0e6">2 RUS</text>
    <text x="196" y="68" font-family="Inter, sans-serif" font-size="11" fill="#f5f0e6">3 NOR</text>
  `),
};

function artFor(name) {
  return ART[name] || ART.cop;
}

function ring(points) {
  return points.map(([lon, lat], i) => {
    const x = (lon + 180).toFixed(1);
    const y = (90 - lat).toFixed(1);
    return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  }).join(' ') + ' Z';
}

const LAND = [
  [[-168, 71], [-156, 71], [-141, 70], [-130, 54], [-124, 48], [-124, 40], [-117, 32], [-110, 24], [-105, 21], [-97, 16], [-87, 21], [-81, 25], [-80, 31], [-76, 35], [-74, 40], [-70, 41], [-66, 45], [-70, 47], [-56, 52], [-64, 60], [-78, 62], [-88, 64], [-94, 68], [-110, 73], [-128, 71], [-140, 70], [-156, 71], [-166, 65], [-168, 71]],
  [[-73, 78], [-60, 83], [-42, 83], [-22, 81], [-20, 73], [-32, 68], [-44, 60], [-52, 66], [-68, 76], [-73, 78]],
  [[-80, 9], [-77, 8], [-75, -5], [-70, -18], [-71, -28], [-73, -38], [-72, -50], [-68, -55], [-65, -52], [-58, -38], [-48, -28], [-39, -16], [-35, -5], [-40, -2], [-50, 0], [-60, 8], [-70, 12], [-77, 7]],
  [[-10, 36], [-9, 43], [-8, 44], [0, 43], [3, 50], [-2, 49], [-5, 50], [-5, 54], [-2, 59], [5, 59], [8, 56], [10, 54], [12, 56], [14, 55], [12, 46], [16, 40], [19, 40], [28, 41], [29, 45], [40, 47], [32, 56], [29, 60], [24, 65], [12, 66], [5, 62], [-6, 62], [-5, 58], [-8, 54], [-10, 52]],
  [[-10, 52], [-8, 55], [-6, 55], [-6, 52], [-9, 51], [-10, 52]],
  [[-6, 58], [-5, 59], [-3, 59], [-2, 58], [-4, 50], [-5, 50], [-5, 54], [-6, 56]],
  [[-17, 21], [-16, 15], [-8, 5], [-10, 4], [9, 4], [10, 2], [14, -12], [12, -18], [14, -22], [18, -34], [20, -35], [26, -34], [32, -29], [35, -20], [34, -10], [40, -15], [42, -12], [51, 12], [43, 12], [39, 15], [43, 15], [32, 31], [25, 32], [10, 37], [-2, 36], [-6, 35], [-10, 32], [-17, 21]],
  [[32, 31], [35, 33], [36, 36], [40, 37], [44, 37], [48, 30], [50, 27], [56, 27], [58, 25], [55, 22], [52, 16], [44, 12], [43, 15], [36, 22], [35, 28]],
  [[43, -12], [50, -15], [47, -25], [44, -25], [43, -16]],
  [[60, 25], [68, 24], [72, 22], [70, 20], [66, 23], [62, 25]],
  [[68, 24], [73, 19], [88, 22], [92, 24], [88, 28], [80, 26], [70, 22]],
  [[40, 40], [48, 42], [60, 45], [70, 45], [80, 50], [90, 50], [100, 52], [120, 54], [140, 58], [160, 66], [180, 68], [190, 66], [180, 64], [160, 60], [140, 52], [130, 42], [120, 38], [110, 20], [108, 14], [104, 2], [100, 8], [98, 16], [80, 16], [78, 8], [73, 8], [68, 22], [60, 25], [50, 26], [44, 12], [42, 16], [36, 22], [34, 30], [36, 36], [40, 40]],
  [[100, 8], [104, 2], [108, 1], [109, 8], [104, 12], [100, 12]],
  [[95, 6], [98, 4], [104, -2], [105, -6], [100, -4], [96, 1]],
  [[105, -6], [114, -8], [114, -7], [108, -6]],
  [[109, 2], [117, 7], [119, 5], [116, -3], [109, 1]],
  [[120, 18], [122, 18], [126, 8], [125, 6], [122, 10], [120, 14]],
  [[131, -1], [141, -2], [150, -10], [147, -6], [141, -8], [132, -4]],
  [[130, 31], [131, 34], [136, 35], [140, 35], [141, 41], [145, 43], [141, 45], [139, 42], [138, 36], [134, 33], [131, 31]],
  [[113, -22], [122, -16], [130, -13], [136, -12], [142, -11], [146, -16], [150, -23], [153, -28], [153, -33], [150, -37], [145, -39], [137, -36], [128, -32], [124, -33], [115, -34], [114, -28], [113, -24]],
  [[166, -46], [168, -47], [171, -44], [174, -41], [172, -40], [168, -43]],
  [[173, -41], [175, -37], [178, -37], [178, -39], [175, -41]],
];

const PINS = {
  1: [30.7, 36.9],
  2: [46.7, 24.7],
  3: [-76.1, -11.0],
  4: [21.0, 52.2],
  5: [30.5, 50.4],
  6: [30.3, 50.5],
  7: [6.1, 46.2],
  8: [4.4, 50.8],
  9: [2.3, 48.9],
  10: [34.5, 31.5],
  11: [56.3, 26.6],
  12: [56.6, 26.3],
  13: [125.6, 7.1],
  14: [174.8, -41.3],
  15: [145.0, -37.8],
  16: [140.1, 37.7],
  17: [135.5, 34.7],
  18: [127.3, 36.5],
  19: [129.3, 35.5],
  20: [126.9, 37.6],
  21: [130.4, 33.6],
  22: [139.7, 35.7],
  23: [127.0, 37.5],
  24: [127.1, 37.6],
  25: [94.0, 24.3],
  26: [90.3, 23.9],
  27: [74.3, 31.5],
  28: [77.2, 28.6],
  29: [36.8, -1.3],
  30: [7.5, 9.1],
  31: [28.0, -26.2],
  32: [31.3, -26.5],
  34: [-115.1, 36.2],
  35: [-80.7, 28.4],
  36: [-58.4, -34.6],
  39: [134.0, -25.0],
  40: [153.4, -28.0],
  41: [145.6, -35.8],
  42: [151.2, -33.9],
  43: [139.8, 35.7],
  44: [139.6, 35.6],
  45: [139.9, 36.6],
  47: [7.7, 45.1],
  48: [-1.5, 52.5],
  49: [-0.3, 51.5],
};

function worldMap() {
  const byId = new Map(allStories().map((s) => [s.n, s]));
  const land = LAND.map((pts) => `<path d="${ring(pts)}"/>`).join('');
  const placed = [];
  const marks = Object.entries(PINS).map(([id, [lon, lat]]) => {
    const story = byId.get(Number(id));
    const colour = COLOUR[story.region];
    const x = lon + 180;
    let y = 90 - lat;
    let guard = 0;
    while (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 5.5) && guard < 6) {
      y -= 3.2;
      guard += 1;
    }
    placed.push({ x, y });
    return `<g><circle cx="${x.toFixed(1)}" cy="${(90 - lat).toFixed(1)}" r="1.3" fill="${colour}" stroke="#f5f0e6" stroke-width="0.35"/>
      <text x="${(x + 1.5).toFixed(1)}" y="${(y - 0.4).toFixed(1)}" font-family="Inter, sans-serif" font-size="4.2" font-weight="700" fill="${colour}">${id}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="360" height="180" fill="#c5d9ea"/>
    <g fill="#243e5c" stroke="#1b3148" stroke-width="0.4" stroke-linejoin="round">${land}</g>
    ${marks}
  </svg>`;
}

function counts() {
  const tally = Object.fromEntries(REGIONS.map((name) => [name, 0]));
  for (const story of allStories()) tally[story.region] += 1;
  return REGIONS.map((name) => ({ name, n: tally[name], colour: COLOUR[name] }));
}

function css() {
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1024px; height: 1024px; background: ${PAPER}; color: ${INK}; }
    .sheet {
      width: 1024px; height: 1024px; padding: 16px 16px 10px; background: ${PAPER};
      display: grid; row-gap: 1px;
      grid-template-rows: 16px 66px 20px 24px 16px 254px 248px 231px 100px 14px;
      font-family: Inter, "Source Sans 3", "Source Sans Pro", Roboto, sans-serif;
    }
    .mast { display: flex; align-items: flex-end; justify-content: space-between; border-top: 3px solid ${INK}; }
    .mast b, .mast span { font-size: 11px; letter-spacing: 0.06em; line-height: 13px; }
    h1 {
      margin: 0; text-align: center; align-self: center;
      font-family: "Playfair Display", "Source Serif Pro", Georgia, serif;
      font-weight: 700; font-size: 64px; line-height: 66px; letter-spacing: -0.02em; white-space: nowrap;
    }
    .kpis, .regions { display: grid; gap: 4px; }
    .kpis { grid-template-columns: repeat(8, 1fr); }
    .kpi, .seg { border: 1px solid ${INK}; background: #fbf7f0; min-width: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
    .kpi b, .seg b { font-size: 11px; line-height: 12px; text-align: right; }
    .kpi span, .seg span { font-size: 8px; letter-spacing: 0.03em; line-height: 10px; }
    .ticks { display: grid; grid-template-columns: repeat(9, 1fr); align-items: end; border-bottom: 2px solid ${INK}; padding-bottom: 1px; }
    .ticks div { text-align: center; font-size: 8px; line-height: 10px; font-weight: 700; }
    .ticks i { display: block; font-style: normal; font-weight: 500; }
    .ticks .eu { text-align: right; padding-right: 8px; }
    .ticks .pl { text-align: right; }
    .regions { grid-template-columns: repeat(8, 1fr); }
    .seg { border-top: 3px solid var(--c); }
    .leads, .cards { display: grid; min-height: 0; gap: 6px; }
    .leads { grid-template-columns: repeat(4, 1fr); }
    .cards { grid-template-columns: repeat(5, 1fr); grid-template-rows: 1fr 1fr; gap: 4px; }
    .lead, .card { border: 1.5px solid ${INK}; background: #fbf7f0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    .art { flex: none; background: #e7e1d4; }
    .lead .art { height: 142px; }
    .card .art { height: 56px; }
    .card .body { padding: 1px 5px 0; }
    .art svg { width: 100%; height: 100%; display: block; }
    .body { padding: 2px 5px 1px; min-height: 0; display: flex; flex-direction: column; }
    .tag { font-size: 8px; font-weight: 750; letter-spacing: 0.03em; line-height: 9px; text-align: left; }
    .num { display: inline-block; min-width: 14px; background: ${INK}; color: ${PAPER}; text-align: center; font-size: 8px; letter-spacing: 0; }
    h2, h3 { margin: 0; text-align: left; font-family: "Playfair Display", "Source Serif Pro", Georgia, serif; font-weight: 700; }
    .lead h2 { font-size: 18px; line-height: 1.02; }
    .card h3 { font-size: 12px; line-height: 1.05; }
    p { margin: 1px 0 0; text-align: left; font-size: 10px; line-height: 1.15; }
    .card p { font-size: 9px; line-height: 1.15; }
    cite { margin: 1px 0 0; font-style: normal; font-size: 8px; font-weight: 700; line-height: 10px; text-align: left; }
    .sure { font-weight: 800; letter-spacing: 0.03em; }
    .split { display: grid; grid-template-columns: 336px 1fr; gap: 6px; min-height: 0; }
    .panel { border: 1.5px solid ${INK}; background: #fbf7f0; min-height: 0; padding: 2px 4px 4px; display: flex; flex-direction: column; overflow: hidden; }
    .panel h2 { margin: 0; font-family: Inter, sans-serif; font-size: 11px; letter-spacing: 0.06em; text-align: left; line-height: 13px; }
    .map { flex: 1; min-height: 0; background: #c5d9ea; }
    .map svg { width: 100%; height: 100%; display: block; }
    .note { margin: 1px 0 0; font-size: 8px; line-height: 10px; text-align: left; white-space: nowrap; }
    .cols { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; align-content: start; }
    .cols h3 { margin: 1px 0 0; font-family: Inter, sans-serif; font-size: 8px; letter-spacing: 0.05em; line-height: 10px; text-align: left; color: var(--c); }
    .brief { margin: 0; font-size: 7.5px; line-height: 9px; text-align: left; }
    .mark { font-weight: 800; letter-spacing: 0.02em; }
    .OFF { color: #1a4a7a; }
    .CONF { color: #1b6b38; }
    .REP { color: #8a5a12; }
    .CLAIM { color: #9e1b28; }
    .datecheck { border: 2px solid ${RED}; padding: 3px 6px 2px; background: ${PAPER}; }
    .datecheck strong { display: block; color: ${RED}; font-size: 11px; letter-spacing: 0.12em; line-height: 13px; text-align: left; }
    .datecheck p { margin: 1px 0 0; font-size: 9px; line-height: 1.22; }
    .datecheck .yet { font-weight: 800; }
    footer { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8.5px; font-weight: 650; line-height: 11px; }
  `;
}

function leadHtml(story) {
  return `<article class="lead">
    <div class="art">${artFor(story.motif)}</div>
    <div class="body">
      <div class="tag"><span class="num">${story.n}</span> ${esc(story.place)} · ${esc(story.topic)}</div>
      <h2>${esc(story.headline)}</h2>
      <p>${esc(story.detail)}</p>
      <cite>${esc(story.source)} · <span class="sure">${esc(story.tag)}</span></cite>
    </div>
  </article>`;
}

function cardHtml(story) {
  return `<article class="card">
    <div class="art">${artFor(story.motif)}</div>
    <div class="body">
      <div class="tag"><span class="num">${story.n}</span> ${esc(story.place)} · ${esc(story.topic)}</div>
      <h3>${esc(story.headline)}</h3>
      <p>${esc(story.detail)}</p>
      <cite>${esc(story.source)} · <span class="sure">${esc(story.tag)}</span></cite>
    </div>
  </article>`;
}

const SHORT = { OFFICIAL: 'OFF', CONFIRMED: 'CONF', REPORTED: 'REP', CLAIM: 'CLAIM' };

function briefHtml(story) {
  const tag = SHORT[story.tag] || story.tag;
  return `<p class="brief"><b>${story.n}</b> ${esc(story.line)} ${esc(story.source)} <span class="mark ${tag}">${tag}</span></p>`;
}

function columns() {
  const groups = [
    ['Europe', 'Middle East', 'Africa'],
    ['East Asia'],
    ['South Asia', 'Oceania', 'Americas', 'Global'],
  ];
  return groups.map((names) => {
    const blocks = names.map((name) => {
      const items = news.briefs.filter((s) => s.region === name).map(briefHtml).join('');
      return `<h3 style="--c:${COLOUR[name]}">${name.toUpperCase()}</h3>${items}`;
    }).join('');
    return `<div>${blocks}</div>`;
  }).join('');
}

function page() {
  const chips = news.kpis.map((k) => `<div class="kpi"><span>${esc(k.label)}</span><b>${esc(k.value)}</b></div>`).join('');
  const ticks = news.ticks.map((tick) => {
    const cls = tick.label === 'EU budget' ? ' class="eu"' : tick.label === 'PL kick-off' ? ' class="pl"' : '';
    return `<div${cls}>${esc(tick.t)}<i>${esc(tick.label)}</i></div>`;
  }).join('');
  const bar = counts().map((c) => `<div class="seg" style="--c:${c.colour}"><span>${esc(c.name)}</span><b>${c.n}</b></div>`).join('');
  const box = news.dateCheck;
  const leftOut = `${box.lead} ${box.items.join('; ')}.`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
    <title>${esc(news.date)}</title><style>${css()}</style></head><body>
    <main class="sheet">
      <header class="mast"><b>${esc(news.kicker)}</b><span>${esc(news.countLine)}</span></header>
      <h1>${esc(news.date)}</h1>
      <section class="kpis">${chips}</section>
      <section class="ticks">${ticks}</section>
      <section class="regions">${bar}</section>
      <section class="leads">${news.leads.map(leadHtml).join('')}</section>
      <section class="cards">${news.features.map(cardHtml).join('')}</section>
      <section class="split">
        <div class="panel">
          <h2>WHERE IT HAPPENED</h2>
          <div class="map">${worldMap()}</div>
          <p class="note">${esc(news.mapNote)} ${esc(news.footnote)}</p>
        </div>
        <div class="panel">
          <h2>ALSO ON SATURDAY 21 NOVEMBER</h2>
          <div class="cols">${columns()}</div>
        </div>
      </section>
      <aside class="datecheck">
        <strong>${esc(box.title)}</strong>
        <p>${esc(leftOut)} <span class="yet">${esc(box.notYet)}</span></p>
      </aside>
      <footer>${esc(news.footer)}</footer>
    </main></body></html>`;
}

function shoot(htmlPath, pngPath) {
  const shot = spawnSync('google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=1024,1024',
    `--screenshot=${pngPath}`, htmlPath,
  ], { stdio: 'inherit', timeout: 60000 });
  if (shot.status !== 0) throw new Error('chrome screenshot failed');
}

function flatten(src, dest) {
  const py = `
from PIL import Image
im = Image.open(${JSON.stringify(src)}).convert("RGB")
if im.size != (1024, 1024):
    raise SystemExit("unexpected size %s" % (im.size,))
im.save(${JSON.stringify(dest)}, format="PNG", optimize=True, compress_level=9)
import os
if os.path.getsize(${JSON.stringify(dest)}) > 1048576:
    q = im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q.save(${JSON.stringify(dest)}, format="PNG", optimize=True, compress_level=9)
`;
  const run = spawnSync('python3', ['-c', py], { stdio: 'inherit' });
  if (run.status !== 0) throw new Error('png flatten failed');
}

function main() {
  validate();
  mkdirSync(here, { recursive: true });
  const htmlPath = join(here, 'poster.html');
  const shotPath = '/tmp/sat-49-shot.png';
  writeFileSync(htmlPath, page());
  shoot(htmlPath, shotPath);
  flatten(shotPath, join(root, 'entry.png'));
  unlinkSync(shotPath);
  const check = spawnSync(process.execPath, [join(here, 'check.mjs')], { stdio: 'inherit' });
  if (check.status !== 0) process.exit(check.status ?? 1);
}

main();
