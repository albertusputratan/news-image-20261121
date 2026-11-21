/**
 * Cream broadsheet renderer.
 * Edit ../news.json, then run: node render/build.mjs
 * Motif keys select original geometric drawings. Unknown keys use "generic".
 */
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const news = JSON.parse(readFileSync(join(root, 'news.json'), 'utf8'));

const INK = '#16130f';
const PAPER = '#f4efe4';
const RED = '#9e1b28';

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function allStories() {
  return [...news.leads, ...news.features, ...news.briefs];
}

function validate() {
  const stories = allStories();
  const n = stories.length;
  if (news.date !== 'Saturday 21 November 2026') {
    throw new Error('date must be Saturday 21 November 2026');
  }
  if (news.kicker !== 'THE WORLD IN ONE DAY') throw new Error('kicker mismatch');
  if (news.countLine !== `${n} STORIES · SATURDAY 21 NOVEMBER 2026`) {
    throw new Error('countLine does not match the story list');
  }
  if (!news.footer.includes('Saturday 21 November 2026')) throw new Error('footer must name the day');
  if (news.leads.length !== 3) throw new Error('need 3 leads');
  if (news.features.length < 8 || news.features.length > 10) {
    throw new Error('this sheet is tuned for 8–10 feature cards');
  }
  if (!news.briefs.length) throw new Error('need at least one brief');
  if (!news.dateCheck?.items?.length) throw new Error('date check needs items');
  const nums = stories.map((s) => s.n);
  if (new Set(nums).size !== nums.length) throw new Error('duplicate story numbers');
  stories.forEach((s, i) => {
    if (s.n !== i + 1) throw new Error(`story number ${s.n} out of order at ${i + 1}`);
    if (!s.place || !s.topic || !s.headline || !s.detail || !s.source) {
      throw new Error(`story ${s.n} is missing copy`);
    }
    if (!s.motif) throw new Error(`story ${s.n} is missing a motif`);
  });
  for (const lead of news.leads) {
    if (!lead.artLabel) throw new Error(`lead ${lead.n} is missing an art label`);
  }
}

function icon(inner) {
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

function art(inner) {
  return `<svg viewBox="0 0 320 112" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner}</svg>`;
}

function rack(x, y, w, h, fill) {
  const slots = [0, 1, 2, 3, 4].map((i) => {
    const sy = y + 7 + i * ((h - 16) / 5);
    return `<rect x="${x + 4}" y="${sy.toFixed(1)}" width="${w - 8}" height="3.5" fill="${PAPER}"/>`;
  }).join('');
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>${slots}<rect x="${x + w - 9}" y="${y + 6}" width="3.5" height="3.5" fill="${RED}"/>`;
}

const MOTIFS = {
  generic() {
    return icon(`<circle cx="16" cy="12" r="6" fill="${INK}"/><rect x="6" y="22" width="20" height="4" fill="${RED}"/>`);
  },
  levy() {
    return art(`
      <rect width="320" height="112" fill="#eadfcb"/>
      ${rack(18, 16, 40, 70, INK)}
      ${rack(66, 26, 40, 60, INK)}
      ${rack(114, 16, 40, 70, INK)}
      <rect x="168" y="12" width="16" height="76" fill="${RED}"/>
      <polygon points="160,12 192,12 176,2" fill="${RED}"/>
      <polygon points="206,52 186,44 186,60" fill="${INK}"/>
      ${rack(214, 34, 36, 52, '#3d342c')}
      ${rack(258, 24, 36, 62, '#3d342c')}
    `);
  },
  exams() {
    let desks = '';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const x = 16 + c * 74;
        const y = 16 + r * 38;
        const cheat = r === 1 && c === 1;
        desks += `<rect x="${x}" y="${y}" width="64" height="32" fill="#f7fbfc" stroke="${INK}" stroke-width="1.6"/>`;
        if (cheat) {
          desks += `<rect x="${x + 22}" y="${y + 6}" width="16" height="20" rx="2" fill="${INK}"/>`;
          desks += `<path d="M${x + 18} ${y + 4} L${x + 44} ${y + 28}" stroke="${RED}" stroke-width="2.4"/>`;
        } else {
          desks += `<rect x="${x + 8}" y="${y + 6}" width="26" height="18" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>`;
          desks += `<path d="M${x + 12} ${y + 12} H${x + 30} M${x + 12} ${y + 17} H${x + 26}" stroke="#b7ad9e" stroke-width="1.2"/>`;
        }
      }
    }
    return art(`
      <rect width="320" height="112" fill="#e3eef3"/>
      ${desks}
      <circle cx="268" cy="34" r="20" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>
      <path d="M268 34 V20 M268 34 L280 40" fill="none" stroke="${INK}" stroke-width="2"/>
      <path d="M268 34 L280 40" stroke="${RED}" stroke-width="2"/>
      <rect x="246" y="64" width="52" height="22" fill="${RED}"/>
      <text x="272" y="80" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="${PAPER}">111</text>
    `);
  },
  verdict() {
    return art(`
      <rect width="320" height="112" fill="#f6ecdf"/>
      <polygon points="0,92 78,36 156,92" fill="#d4b48a"/>
      <polygon points="86,92 156,50 236,92" fill="#b8895c"/>
      <polygon points="70,58 80,38 90,58" fill="#c44820"/>
      <polygon points="74,58 80,46 86,58" fill="#e6b15a"/>
      <polygon points="196,44 304,44 290,30 210,30" fill="${INK}"/>
      <rect x="214" y="44" width="12" height="48" fill="${INK}"/>
      <rect x="238" y="44" width="12" height="48" fill="${INK}"/>
      <rect x="262" y="44" width="12" height="48" fill="${INK}"/>
      <rect x="286" y="44" width="12" height="48" fill="${INK}"/>
      <rect x="118" y="46" width="4" height="42" fill="${INK}"/>
      <rect x="98" y="48" width="44" height="3.5" fill="${INK}"/>
      <path d="M106 52 V66 M134 52 V66" stroke="${INK}" stroke-width="1.6"/>
      <ellipse cx="106" cy="70" rx="11" ry="4.5" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/>
      <ellipse cx="134" cy="70" rx="11" ry="4.5" fill="${RED}" stroke="${INK}" stroke-width="1.4"/>
    `);
  },
  talks() {
    return icon(`
      <rect x="2" y="6" width="13" height="12" fill="${PAPER}" stroke="${INK}" stroke-width="1.7"/>
      <rect x="17" y="14" width="13" height="12" fill="${PAPER}" stroke="${INK}" stroke-width="1.7"/>
      <path d="M14 12 H18" stroke="${RED}" stroke-width="1.8"/>
      <path d="M16 9.5 L19.5 12 L16 14.5" fill="none" stroke="${RED}" stroke-width="1.8"/>
    `);
  },
  rally() {
    return icon(`
      <circle cx="7" cy="9" r="3" fill="${INK}"/>
      <rect x="4" y="13" width="6" height="11" fill="${INK}"/>
      <circle cx="16" cy="7" r="3.4" fill="${RED}"/>
      <rect x="12.4" y="11.2" width="7.2" height="13" fill="${RED}"/>
      <circle cx="25" cy="10" r="3" fill="${INK}"/>
      <rect x="22" y="14" width="6" height="10" fill="${INK}"/>
      <path d="M3 28 H29" stroke="${INK}" stroke-width="1.7"/>
    `);
  },
  tennis() {
    return icon(`
      <rect x="3" y="6" width="26" height="20" fill="#e5f0e2" stroke="${INK}" stroke-width="1.7"/>
      <path d="M16 6 V26 M3 16 H29" stroke="${INK}" stroke-width="1.4"/>
      <circle cx="22" cy="11" r="3.2" fill="#c44820"/>
    `);
  },
  markets() {
    return icon(`
      <rect x="3" y="8" width="5" height="18" fill="${INK}"/>
      <rect x="10" y="12" width="5" height="14" fill="${INK}"/>
      <rect x="17" y="16" width="5" height="10" fill="${INK}"/>
      <rect x="24" y="20" width="5" height="6" fill="${RED}"/>
    `);
  },
  press() {
    return icon(`
      <rect x="6" y="3" width="20" height="26" fill="${PAPER}" stroke="${INK}" stroke-width="1.7"/>
      <circle cx="16" cy="12" r="4" fill="none" stroke="${INK}" stroke-width="1.7"/>
      <rect x="14.2" y="16" width="3.6" height="6" fill="${INK}"/>
      <path d="M10 24 H22" stroke="${RED}" stroke-width="1.8"/>
    `);
  },
  seal() {
    return icon(`
      <rect x="8" y="2" width="16" height="28" fill="${PAPER}" stroke="${INK}" stroke-width="1.7"/>
      <circle cx="16" cy="12" r="5" fill="none" stroke="${RED}" stroke-width="1.7"/>
      <path d="M12 21 H20 M12 25 H18" stroke="${INK}" stroke-width="1.5"/>
    `);
  },
  table() {
    return icon(`
      <ellipse cx="16" cy="20" rx="13" ry="7" fill="${PAPER}" stroke="${INK}" stroke-width="1.7"/>
      <rect x="7" y="6" width="8" height="10" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/>
      <rect x="17" y="4" width="8" height="10" fill="${RED}"/>
    `);
  },
  teams() {
    return icon(`
      <rect x="2" y="6" width="8" height="8" fill="${INK}"/>
      <rect x="12" y="6" width="8" height="8" fill="${INK}"/>
      <rect x="22" y="6" width="8" height="8" fill="${RED}"/>
      <rect x="5" y="20" width="22" height="7" fill="none" stroke="${INK}" stroke-width="1.7"/>
    `);
  },
};

function motif(name, kind) {
  const draw = MOTIFS[name] || MOTIFS.generic;
  if (kind === 'lead' && name !== 'levy' && name !== 'exams' && name !== 'verdict') {
    return art(`<rect width="320" height="112" fill="#e7dcc8"/><circle cx="230" cy="46" r="26" fill="${INK}"/><rect x="28" y="62" width="120" height="8" fill="${RED}"/>`);
  }
  return draw();
}

const PINS = [
  { n: [1, 6], x: 150, y: 74 },
  { n: [3], x: 52, y: 80 },
  { n: [10], x: 116, y: 98 },
  { n: [11], x: 250, y: 48 },
  { n: [5], x: 292, y: 44 },
  { n: [7], x: 308, y: 66 },
  { n: [9], x: 338, y: 84 },
  { n: [2, 12], x: 574, y: 68 },
  { n: [4], x: 548, y: 154 },
];

function worldMap(storyNums) {
  const pins = PINS.map((pin) => {
    const present = pin.n.filter((num) => storyNums.has(num));
    if (!present.length) return '';
    const label = present.join('·');
    const w = 8 + label.length * 7;
    return `<g>
      <rect x="${pin.x - w / 2}" y="${pin.y - 9}" width="${w}" height="18" rx="2" fill="${INK}"/>
      <text x="${pin.x}" y="${pin.y + 4}" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="${PAPER}">${label}</text>
    </g>`;
  }).join('');
  return `<svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="640" height="200" fill="#d5e3eb"/>
    <g stroke="#c3d4de" stroke-width="1">
      <path d="M0 50 H640 M0 100 H640 M0 150 H640"/>
    </g>
    <g fill="${PAPER}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M28 48 L78 30 L128 36 L168 58 L176 78 L156 102 L118 112 L78 106 L46 118 L34 96 L22 70 Z"/>
      <path d="M96 122 L142 118 L158 148 L150 186 L116 190 L92 162 Z"/>
      <path d="M242 40 L258 36 L264 54 L248 60 Z"/>
      <path d="M266 36 L314 30 L332 48 L318 70 L278 74 L256 56 Z"/>
      <path d="M268 96 L326 88 L346 120 L332 176 L286 186 L252 150 L248 114 Z"/>
      <path d="M328 72 L350 76 L342 96 L322 90 Z"/>
      <path d="M346 34 L440 26 L530 36 L586 62 L578 96 L520 114 L430 112 L360 90 L344 64 Z"/>
      <path d="M558 56 L584 50 L590 76 L564 82 Z"/>
      <path d="M498 134 L572 126 L612 150 L590 180 L518 178 L488 156 Z"/>
    </g>
    ${pins}
  </svg>`;
}

function css() {
  return `
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 1024px;
      height: 1024px;
      background: ${PAPER};
      color: ${INK};
    }
    .page {
      width: 1024px;
      height: 1024px;
      padding: 10px 14px 8px;
      display: grid;
      grid-template-rows: 22px 88px 22px 300px 252px 176px 94px 24px;
      row-gap: 4px;
      background: ${PAPER};
      font-family: Inter, "Source Sans 3", "Source Sans Pro", Roboto, sans-serif;
    }
    .mast {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      border-top: 4px solid ${INK};
      border-bottom: 1px solid ${INK};
      padding-bottom: 1px;
    }
    .kicker-main, .count {
      font-size: 12px;
      font-weight: 750;
      letter-spacing: 0.14em;
      line-height: 14px;
    }
    .count { letter-spacing: 0.08em; font-weight: 700; }
    h1.date {
      margin: 0;
      align-self: center;
      text-align: center;
      font-family: "Playfair Display", "Source Serif Pro", Georgia, serif;
      font-weight: 700;
      font-size: 76px;
      line-height: 84px;
      letter-spacing: -0.012em;
      white-space: nowrap;
    }
    .deck {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 2px solid ${INK};
      font-family: "Source Serif Pro", "Playfair Display", Georgia, serif;
      font-style: italic;
      font-size: 15px;
      line-height: 18px;
      text-align: center;
    }
    .leads, .features, .split {
      min-height: 0;
      display: grid;
      gap: 8px;
    }
    .leads { grid-template-columns: repeat(3, 1fr); }
    .features {
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: 1fr 1fr;
      gap: 6px;
    }
    .split { grid-template-columns: 1.28fr 0.82fr; }
    .lead, .card, .panel, .datecheck {
      border: 1.5px solid ${INK};
      background: #fbf7f0;
      min-height: 0;
    }
    .lead { display: flex; flex-direction: column; }
    .art { position: relative; height: 114px; flex: none; background: #e7dcc8; }
    .art svg { width: 100%; height: 100%; display: block; }
    .art-label {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 20px;
      display: flex;
      align-items: center;
      padding: 0 8px;
      background: ${INK};
      color: ${PAPER};
      font-size: 11px;
      font-weight: 750;
      letter-spacing: 0.14em;
    }
    .lead-body, .card {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .lead-body { flex: 1; padding: 7px 9px 6px; }
    .card { padding: 6px 8px 5px; }
    .tag {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 750;
      letter-spacing: 0.06em;
      line-height: 14px;
    }
    .card .tag { font-size: 10px; letter-spacing: 0.05em; }
    .num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 3px;
      background: ${INK};
      color: ${PAPER};
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0;
    }
    .lead h2, .card h3, .brief h3 {
      margin: 3px 0 0;
      font-family: "Playfair Display", "Source Serif Pro", Georgia, serif;
      font-weight: 700;
      color: ${INK};
    }
    .lead h2 { font-size: 21px; line-height: 1.12; }
    .card h3 { font-size: 14.5px; line-height: 1.15; }
    .lead p, .card p {
      margin: 4px 0 0;
      font-size: 13px;
      line-height: 1.28;
    }
    .card p { font-size: 12px; line-height: 1.25; margin-top: 3px; }
    cite {
      margin-top: auto;
      padding-top: 3px;
      font-style: normal;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      line-height: 13px;
    }
    .card .icon { width: 22px; height: 22px; flex: none; }
    .card .tag { min-height: 22px; }
    .panel { padding: 6px 8px 5px; display: flex; flex-direction: column; }
    .panel h2, .brief-head {
      margin: 0;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.12em;
      line-height: 14px;
    }
    .map-canvas { flex: 1; min-height: 0; margin: 3px 0; }
    .map-canvas svg { width: 100%; height: 100%; display: block; }
    .map-note, .datecheck p, footer {
      margin: 0;
      font-size: 11.5px;
      line-height: 1.3;
    }
    .brief-head { letter-spacing: 0.08em; }
    .brief { padding-top: 4px; display: flex; flex-direction: column; flex: 1; }
    .brief .tag { margin-top: 6px; }
    .brief h3 { font-size: 18px; line-height: 1.18; }
    .brief p { margin: 4px 0 0; font-size: 14px; line-height: 1.3; }
    .datecheck {
      padding: 6px 8px 5px;
      border-width: 2px;
      border-color: ${RED};
      background: ${PAPER};
    }
    .datecheck strong {
      display: block;
      color: ${RED};
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.14em;
      line-height: 14px;
      margin-bottom: 2px;
    }
    .datecheck p { font-size: 12px; line-height: 1.28; }
    footer {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 12px;
      font-weight: 650;
      letter-spacing: 0.01em;
    }
  `;
}

function leadHtml(story) {
  return `<article class="lead">
    <div class="art">${motif(story.motif, 'lead')}<div class="art-label">${esc(story.artLabel)}</div></div>
    <div class="lead-body">
      <div class="tag"><span class="num">${story.n}</span> ${esc(story.place)} · ${esc(story.topic)}</div>
      <h2>${esc(story.headline)}</h2>
      <p>${esc(story.detail)}</p>
      <cite>${esc(story.source)}</cite>
    </div>
  </article>`;
}

function cardHtml(story) {
  return `<article class="card">
    <div class="tag"><span class="icon">${motif(story.motif, 'icon')}</span><span class="num">${story.n}</span> ${esc(story.place)} · ${esc(story.topic)}</div>
    <h3>${esc(story.headline)}</h3>
    <p>${esc(story.detail)}</p>
    <cite>${esc(story.source)}</cite>
  </article>`;
}

function briefHtml(story) {
  return `<div class="brief">
    <div class="tag"><span class="icon">${motif(story.motif, 'icon')}</span><span class="num">${story.n}</span> ${esc(story.place)} · ${esc(story.topic)}</div>
    <h3>${esc(story.headline)}</h3>
    <p>${esc(story.detail)}</p>
    <cite>${esc(story.source)}</cite>
  </div>`;
}

function page() {
  const nums = new Set(allStories().map((s) => s.n));
  const dc = news.dateCheck;
  const dcBody = `${dc.lead} ${dc.items.join('; ')}.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(news.date)}</title>
<style>${css()}</style>
</head>
<body>
  <main class="page">
    <header class="mast">
      <div class="kicker-main">${esc(news.kicker)}</div>
      <div class="count">${esc(news.countLine)}</div>
    </header>
    <h1 class="date">${esc(news.date)}</h1>
    <p class="deck">${esc(news.deck)}</p>
    <section class="leads">${news.leads.map(leadHtml).join('')}</section>
    <section class="features">${news.features.map(cardHtml).join('')}</section>
    <section class="split">
      <div class="panel">
        <h2>${esc(news.labels.map)}</h2>
        <div class="map-canvas">${worldMap(nums)}</div>
        <p class="map-note">${esc(news.labels.mapNote)}</p>
      </div>
      <div class="panel">
        <h2 class="brief-head">${esc(news.labels.briefs)}</h2>
        ${news.briefs.map(briefHtml).join('')}
      </div>
    </section>
    <aside class="datecheck"><strong>${esc(dc.title)}</strong><p>${esc(dcBody)}</p></aside>
    <footer>${esc(news.footer)}</footer>
  </main>
</body>
</html>`;
}

function shoot(htmlPath, pngPath) {
  const r = spawnSync('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1024,1024',
    `--screenshot=${pngPath}`,
    htmlPath,
  ], { stdio: 'inherit', timeout: 60000 });
  if (r.status !== 0) throw new Error(`chrome failed for ${htmlPath}`);
}

function optimise(src, dest) {
  const py = `
from PIL import Image
im = Image.open(${JSON.stringify(src)}).convert("RGB")
w, h = im.size
if (w, h) != (1024, 1024):
    raise SystemExit(f"unexpected screenshot size {w}x{h}")
im.save(${JSON.stringify(dest)}, format="PNG", optimize=True, compress_level=9)
if __import__("os").path.getsize(${JSON.stringify(dest)}) > 1048576:
    q = im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q.save(${JSON.stringify(dest)}, format="PNG", optimize=True, compress_level=9)
`;
  const r = spawnSync('python3', ['-c', py], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`optimise failed for ${dest}`);
}

function main() {
  validate();
  mkdirSync(here, { recursive: true });
  const htmlPath = join(here, 'poster.html');
  const shot = join('/tmp', 'news-shot-20261121.png');
  const dest = join(root, 'entry.png');
  writeFileSync(htmlPath, page());
  shoot(htmlPath, shot);
  optimise(shot, dest);
  unlinkSync(shot);
  console.log(`wrote ${dest}`);
  const check = spawnSync(process.execPath, [join(here, 'check.mjs')], { stdio: 'inherit' });
  if (check.status !== 0) process.exit(check.status ?? 1);
}

main();
