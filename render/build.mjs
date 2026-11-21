/**
 * Saturday 21 November 2026 broadsheet.
 * Edit ../news.json and run: node render/build.mjs
 * Motif names pick original flat drawings. Unknown names fall back to a square.
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

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function stories() {
  return [...news.leads, ...news.features, ...news.briefs];
}

function validate() {
  const list = stories();
  const count = list.length;
  if (news.date !== 'Saturday 21 November 2026') throw new Error('date must be Saturday 21 November 2026');
  if (news.kicker !== 'THE WORLD IN ONE DAY') throw new Error('kicker mismatch');
  if (news.countLine !== `${count} STORIES · 5 REGIONS · SATURDAY 21 NOVEMBER 2026`) {
    throw new Error(`countLine mismatch for ${count} stories`);
  }
  if (!news.footer.includes('Saturday 21 November 2026')) throw new Error('footer must name Saturday');
  if (news.leads.length !== 3) throw new Error('need 3 leads');
  if (news.features.length < 8 || news.features.length > 10) throw new Error('need 8–10 feature cards');
  if (!news.briefs.length) throw new Error('need briefs');
  const regions = new Set(news.regions);
  if (regions.size !== 5) throw new Error('need exactly 5 regions');
  if (!news.dateCheck?.lead?.startsWith('Left out on purpose')) throw new Error('date check lead');
  if (!news.dateCheck.items || news.dateCheck.items.length < 20) throw new Error('date check is short');
  list.forEach((story, index) => {
    if (story.n !== index + 1) throw new Error(`story ${story.n} is out of order`);
    if (!regions.has(story.region)) throw new Error(`story ${story.n} has a bad region`);
    if (!story.place || !story.source || !story.motif) throw new Error(`story ${story.n} is incomplete`);
    const body = story.detail || story.line;
    if (!body || !story.headline && !story.line) throw new Error(`story ${story.n} has no text`);
  });
  for (const lead of news.leads) {
    if (!lead.artLabel || !lead.headline || !lead.detail) throw new Error(`lead ${lead.n} is incomplete`);
  }
}

function icon(inner) {
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

function scene(inner) {
  return `<svg viewBox="0 0 320 96" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner}</svg>`;
}

const DRAWINGS = {
  generic() {
    return icon(`<rect x="6" y="6" width="20" height="20" fill="none" stroke="${INK}" stroke-width="1.8"/><rect x="10" y="20" width="12" height="3" fill="${RED}"/>`);
  },
  exams() {
    let desks = '';
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = 16 + col * 70;
        const y = 14 + row * 36;
        desks += `<rect x="${x}" y="${y}" width="58" height="28" fill="#f7fbfc" stroke="${INK}" stroke-width="1.5"/>`;
        desks += `<rect x="${x + 8}" y="${y + 6}" width="24" height="16" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>`;
      }
    }
    return scene(`
      <rect width="320" height="96" fill="#e4eef3"/>
      ${desks}
      <rect x="232" y="18" width="68" height="54" fill="${PAPER}" stroke="${INK}" stroke-width="1.8"/>
      <rect x="232" y="18" width="68" height="14" fill="${INK}"/>
      <text x="266" y="54" text-anchor="middle" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="${INK}">21</text>
    `);
  },
  homebirth() {
    return scene(`
      <rect width="320" height="96" fill="#f3e6d4"/>
      <polygon points="118,58 168,22 218,58" fill="${INK}"/>
      <rect x="132" y="58" width="72" height="28" fill="${PAPER}" stroke="${INK}" stroke-width="1.8"/>
      <rect x="160" y="68" width="16" height="18" fill="${INK}"/>
      <circle cx="46" cy="40" r="7" fill="${INK}"/>
      <rect x="39" y="49" width="14" height="22" fill="${INK}"/>
      <circle cx="78" cy="44" r="7" fill="${RED}"/>
      <rect x="71" y="53" width="14" height="20" fill="${RED}"/>
      <circle cx="250" cy="42" r="7" fill="${INK}"/>
      <rect x="243" y="51" width="14" height="20" fill="${INK}"/>
      <circle cx="282" cy="46" r="7" fill="${INK}"/>
      <rect x="275" y="55" width="14" height="18" fill="${INK}"/>
      <rect x="24" y="78" width="272" height="5" fill="${RED}"/>
    `);
  },
  strait() {
    return scene(`
      <rect width="320" height="96" fill="#d5e4ec"/>
      <polygon points="0,0 150,0 118,96 0,96" fill="#e7d3b0"/>
      <polygon points="320,0 188,0 214,96 320,96" fill="#e7d3b0"/>
      <rect x="214" y="28" width="46" height="10" fill="${INK}"/>
      <circle cx="224" cy="33" r="7" fill="none" stroke="${INK}" stroke-width="2"/>
      <circle cx="250" cy="33" r="7" fill="none" stroke="${INK}" stroke-width="2"/>
      <path d="M210 22 L258 48" stroke="${RED}" stroke-width="3"/>
      <text x="168" y="78" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="${INK}">CLAIM</text>
    `);
  },
  cricket() {
    return icon(`<rect x="4" y="14" width="24" height="10" fill="#e7f0e2" stroke="${INK}" stroke-width="1.5"/><rect x="20" y="4" width="4" height="22" transform="rotate(28 22 15)" fill="${INK}"/><circle cx="10" cy="19" r="3" fill="${RED}"/>`);
  },
  shops() {
    return icon(`<rect x="5" y="10" width="22" height="16" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/><path d="M5 14 H27" stroke="${INK}" stroke-width="1.4"/><rect x="14" y="16" width="5" height="10" fill="${RED}"/>`);
  },
  bolt() {
    return icon(`<polygon points="18,3 8,18 15,18 12,29 26,13 18,13" fill="${RED}"/>`);
  },
  road() {
    return icon(`<rect x="3" y="8" width="26" height="16" fill="#d9d3c6" stroke="${INK}" stroke-width="1.5"/><path d="M16 10 V22" stroke="${PAPER}" stroke-width="2" stroke-dasharray="3 2"/><rect x="18" y="14" width="8" height="5" fill="${INK}"/>`);
  },
  crowd() {
    return icon(`<circle cx="16" cy="7" r="4" fill="#e6b15a"/><circle cx="8" cy="16" r="3" fill="${INK}"/><rect x="5" y="20" width="6" height="8" fill="${INK}"/><circle cx="16" cy="15" r="3.2" fill="${RED}"/><rect x="12.6" y="19" width="6.8" height="9" fill="${RED}"/><circle cx="24" cy="16" r="3" fill="${INK}"/><rect x="21" y="20" width="6" height="8" fill="${INK}"/>`);
  },
  block() {
    return icon(`<rect x="4" y="6" width="24" height="18" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/><path d="M8 22 L24 8" stroke="${RED}" stroke-width="2.2"/>`);
  },
  ball() {
    return icon(`<circle cx="16" cy="16" r="10" fill="${PAPER}" stroke="${INK}" stroke-width="1.7"/><path d="M16 6 V26 M7 16 H25 M9 10 Q16 16 9 22 M23 10 Q16 16 23 22" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
  },
  camera() {
    return icon(`<rect x="4" y="10" width="24" height="14" rx="1" fill="${INK}"/><circle cx="16" cy="17" r="4" fill="${PAPER}"/><rect x="10" y="7" width="8" height="4" fill="${RED}"/>`);
  },
  court() {
    return icon(`<rect x="6" y="14" width="4" height="12" fill="${INK}"/><rect x="22" y="14" width="4" height="12" fill="${INK}"/><polygon points="4,14 28,14 24,8 8,8" fill="${INK}"/><rect x="14" y="18" width="4" height="8" fill="${RED}"/>`);
  },
  report() {
    return icon(`<rect x="7" y="3" width="18" height="26" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/><path d="M11 10 H21 M11 15 H21 M11 20 H17" stroke="${INK}" stroke-width="1.4"/><rect x="11" y="23" width="8" height="3" fill="${RED}"/>`);
  },
};

function drawing(name) {
  const paint = DRAWINGS[name] || DRAWINGS.generic;
  return paint();
}

function worldSvg() {
  const pins = [
    ['1', 552, 72],
    ['3', 378, 92],
    ['12', 312, 132],
    ['13', 292, 176],
    ['16', 322, 164],
    ['25', 262, 128],
    ['AU', 524, 162],
    ['PK', 424, 102],
    ['JP', 588, 86],
  ];
  const marks = pins.map(([label, x, y]) => {
    const width = 10 + String(label).length * 7;
    return `<g><rect x="${x - width / 2}" y="${y - 8}" width="${width}" height="16" fill="${INK}"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="${PAPER}">${label}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 640 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="640" height="210" fill="#d7e4ec"/>
    <g fill="${PAPER}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round">
      <path d="M36 52 L86 34 L140 42 L176 66 L168 104 L124 116 L78 108 L40 120 L28 88 Z"/>
      <path d="M108 124 L150 120 L162 156 L146 188 L112 184 Z"/>
      <path d="M248 40 L300 34 L324 56 L306 78 L258 74 Z"/>
      <path d="M236 44 L252 40 L256 58 L240 62 Z"/>
      <path d="M250 96 L318 88 L338 128 L320 186 L270 190 L236 150 Z"/>
      <path d="M330 70 L392 62 L430 84 L418 112 L360 116 L332 96 Z"/>
      <path d="M400 78 L470 70 L520 96 L500 124 L430 120 Z"/>
      <path d="M430 36 L520 28 L590 48 L604 78 L548 96 L470 88 L438 64 Z"/>
      <path d="M560 58 L586 52 L592 74 L566 78 Z"/>
      <path d="M486 140 L560 132 L604 156 L578 186 L504 180 Z"/>
    </g>
    ${marks}
  </svg>`;
}

function css() {
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1024px; height: 1024px; background: ${PAPER}; color: ${INK}; }
    .sheet {
      width: 1024px; height: 1024px; padding: 8px 10px 6px;
      display: grid;
      grid-template-rows: 16px 70px 14px 175px 204px 305px 189px 16px;
      row-gap: 3px;
      background: ${PAPER};
      font-family: Inter, "Source Sans 3", "Source Sans Pro", Roboto, sans-serif;
    }
    .mast {
      display: flex; align-items: flex-end; justify-content: space-between;
      border-top: 3px solid ${INK}; border-bottom: 1px solid ${INK};
    }
    .mast b, .mast span { font-size: 11px; letter-spacing: 0.08em; line-height: 12px; }
    h1 {
      margin: 0; align-self: center; text-align: center;
      font-family: "Playfair Display", "Source Serif Pro", Georgia, serif;
      font-weight: 700; font-size: 64px; line-height: 66px; letter-spacing: -0.018em;
      white-space: nowrap;
    }
    .deck {
      margin: 0; display: flex; align-items: center; justify-content: center;
      border-bottom: 2px solid ${INK};
      font-family: "Source Serif Pro", Georgia, serif; font-style: italic;
      font-size: 13px; line-height: 14px; text-align: center;
    }
    .leads, .cards, .split { min-height: 0; display: grid; }
    .leads { grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .cards { grid-template-columns: repeat(5, 1fr); grid-template-rows: 1fr 1fr; gap: 4px; }
    .split { grid-template-columns: 300px 1fr; gap: 6px; }
    .lead, .card, .panel { border: 1.5px solid ${INK}; background: #fbf7f0; min-height: 0; }
    .lead { display: flex; flex-direction: column; }
    .scene { position: relative; height: 58px; flex: none; }
    .scene svg { width: 100%; height: 100%; display: block; }
    .scene em {
      position: absolute; left: 0; right: 0; bottom: 0; height: 16px;
      display: flex; align-items: center; padding: 0 6px;
      background: ${INK}; color: ${PAPER}; font-style: normal;
      font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    }
    .lead div.body, .card { display: flex; flex-direction: column; padding: 4px 6px 3px; }
    .lead div.body { flex: 1; }
    .tag { font-size: 9px; font-weight: 750; letter-spacing: 0.04em; line-height: 11px; }
    .num { display: inline-block; min-width: 14px; padding: 0 2px; background: ${INK}; color: ${PAPER}; text-align: center; font-size: 9px; letter-spacing: 0; }
    h2, h3 { margin: 1px 0 0; font-family: "Playfair Display", "Source Serif Pro", Georgia, serif; font-weight: 700; }
    .lead h2 { font-size: 13.5px; line-height: 1.1; }
    .card h3 { font-size: 11.5px; line-height: 1.1; }
    p { margin: 2px 0 0; font-size: 10.5px; line-height: 1.2; }
    .card p { font-size: 9.5px; line-height: 1.18; }
    cite { margin-top: auto; padding-top: 2px; font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.02em; line-height: 11px; }
    .card svg, .tag svg { width: 15px; height: 15px; vertical-align: -3px; margin-right: 2px; }
    .panel { padding: 4px 6px 3px; display: flex; flex-direction: column; }
    .panel h2 { margin: 0; font-family: Inter, "Source Sans 3", sans-serif; font-size: 11px; letter-spacing: 0.1em; }
    .map { flex: 1; min-height: 0; }
    .map svg { width: 100%; height: 100%; display: block; }
    .note { margin: 2px 0 0; font-size: 9.5px; line-height: 1.2; }
    .brief-head { letter-spacing: 0.06em; }
    .brief-list { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; align-content: start; margin-top: 3px; }
    .brief { margin: 0; font-size: 10px; line-height: 1.22; }
    .brief b { font-size: 9px; }
    .datecheck { border: 2px solid ${RED}; padding: 4px 6px 3px; background: ${PAPER}; }
    .datecheck strong {
      display: block; color: ${RED}; font-size: 11px; letter-spacing: 0.12em; line-height: 13px;
    }
    .datecheck p { margin: 1px 0 0; font-size: 10.5px; line-height: 1.25; }
    footer { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; font-weight: 650; line-height: 12px; }
  `;
}

function leadBlock(story) {
  return `<article class="lead">
    <div class="scene">${drawing(story.motif)}<em>${esc(story.artLabel)}</em></div>
    <div class="body">
      <div class="tag"><span class="num">${story.n}</span> ${esc(story.place)} · ${esc(story.topic)}</div>
      <h2>${esc(story.headline)}</h2>
      <p>${esc(story.detail)}</p>
      <cite>${esc(story.source)}</cite>
    </div>
  </article>`;
}

function cardBlock(story) {
  return `<article class="card">
    <div class="tag">${drawing(story.motif)} <span class="num">${story.n}</span> ${esc(story.place)} · ${esc(story.topic)}</div>
    <h3>${esc(story.headline)}</h3>
    <p>${esc(story.detail)}</p>
    <cite>${esc(story.source)}</cite>
  </article>`;
}

function briefBlock(story) {
  return `<p class="brief"><b>${story.n} ${esc(story.place)}</b> ${esc(story.line)} <b>${esc(story.source)}</b></p>`;
}

function htmlPage() {
  const box = news.dateCheck;
  const leftOut = `${box.lead} ${box.items.join('; ')}.`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>${esc(news.date)}</title><style>${css()}</style></head>
<body><main class="sheet">
  <header class="mast"><b>${esc(news.kicker)}</b><span>${esc(news.countLine)}</span></header>
  <h1>${esc(news.date)}</h1>
  <p class="deck">${esc(news.deck)}</p>
  <section class="leads">${news.leads.map(leadBlock).join('')}</section>
  <section class="cards">${news.features.map(cardBlock).join('')}</section>
  <section class="split">
    <div class="panel">
      <h2>${esc(news.labels.map)}</h2>
      <div class="map">${worldSvg()}</div>
      <p class="note">${esc(news.labels.mapNote)}</p>
    </div>
    <div class="panel">
      <h2 class="brief-head">${esc(news.labels.briefs)}</h2>
      <div class="brief-list">${news.briefs.map(briefBlock).join('')}</div>
    </div>
  </section>
  <aside class="datecheck"><strong>${esc(box.title)}</strong><p>${esc(leftOut)}</p></aside>
  <footer>${esc(news.footer)}</footer>
</main></body></html>`;
}

function shoot(htmlPath, pngPath) {
  const shot = spawnSync('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1024,1024',
    `--screenshot=${pngPath}`,
    htmlPath,
  ], { stdio: 'inherit', timeout: 60000 });
  if (shot.status !== 0) throw new Error('chrome screenshot failed');
}

function flatten(src, dest) {
  const py = `
from PIL import Image
im = Image.open(${JSON.stringify(src)}).convert("RGB")
if im.size != (1024, 1024):
    raise SystemExit(f"unexpected size {im.size}")
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
  const shotPath = '/tmp/saturday-sheet-shot.png';
  writeFileSync(htmlPath, htmlPage());
  shoot(htmlPath, shotPath);
  flatten(shotPath, join(root, 'entry.png'));
  unlinkSync(shotPath);
  const check = spawnSync(process.execPath, [join(here, 'check.mjs')], { stdio: 'inherit' });
  if (check.status !== 0) process.exit(check.status ?? 1);
}

main();
