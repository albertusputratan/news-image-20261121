import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const news = JSON.parse(readFileSync(join(root, "news.json"), "utf8"));
const dry = process.argv.includes("--dry");

const SHORT = { OFFICIAL: "OFF", CONFIRMED: "CONF", REPORTED: "REP", CLAIM: "CLAIM" };
const LEADS = [1, 2, 3, 4];
const MIDS = [5, 8, 7, 13, 25, 26, 14, 46, 49, 34];
const COLS = [
  ["EUR", "MEA", "AFR"],
  ["EAS"],
  ["SAS", "OCE", "AME", "GLB"],
];

const byId = new Map(news.stories.map((s) => [s.id, s]));
const regionById = new Map(news.regions.map((r) => [r.id, r]));

function assertEdition() {
  if (news.stories.length !== 49) throw new Error(`expected 49 stories, got ${news.stories.length}`);
  const counts = {};
  for (const story of news.stories) {
    counts[story.region] = (counts[story.region] || 0) + 1;
    if (!story.tag || !story.sources) throw new Error(`story ${story.id} needs a source and a tag`);
  }
  for (const region of news.regions) {
    if (counts[region.id] !== region.count) {
      throw new Error(`${region.id} count ${counts[region.id]} != ${region.count}`);
    }
  }
  for (const id of LEADS) {
    if (byId.get(id)?.role !== "lead") throw new Error(`lead ${id}`);
  }
  for (const id of MIDS) {
    if (byId.get(id)?.role !== "mid") throw new Error(`mid ${id}`);
  }
  const off = news.stories.filter((s) => !s.onMap).map((s) => s.id).sort((a, b) => a - b);
  if (off.join(",") !== "37,38,46") throw new Error(`off-map ${off.join(",")}`);
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ring(spec) {
  return spec
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number));
}

const LAND = [
  ring(`-168,65 -162,60 -153,57 -142,60 -136,57 -130,54 -125,49 -124,40 -122,36 -117,32.5 -114,27 -109,24 -105,21 -97,16 -91,14.5 -87,21 -94,26 -97,26.2 -94,29.5 -89,29 -83,29.5 -81,25.2 -80.2,25.4 -81.2,31 -77,34.5 -75.5,35.5 -74,39.5 -70.5,42 -67,44.5 -64,45 -60,47.2 -56,52 -56,54.5 -62,58 -72,59 -80,63 -86,67 -94,72 -108,74 -128,72 -140,70 -156,71 -166,68 -168,65`),
  ring(`-81,8.6 -77,7.8 -71,12 -67,10.6 -61,8.4 -51,4.2 -44,-1 -35,-5 -34.8,-10 -39,-16 -40,-22 -43,-23.2 -48,-28 -52,-32.5 -55,-34.8 -58.5,-38.5 -62,-41 -65,-47 -68,-55 -74,-52 -73.5,-45 -72,-30 -71,-18 -76,-14 -78,-8 -81,-5 -79,1 -77,7 -81,8.6`),
  ring(`-73,78 -62,82 -45,83 -32,83 -22,81 -20,73 -30,68 -44,60 -48,61 -55,66 -62,66 -68,76 -73,78`),
  ring(`-9.6,37 -8.9,41.8 -8.2,43.5 -1.8,43.3 -1.5,46 -4.7,48.2 -1.6,49.4 0.2,49.5 1.5,51 3.2,51.3 4.6,52.4 6.6,53.6 8.2,55.2 8.8,57.4 10.4,57.7 12.2,55.6 14,54.2 18.2,54.6 22,54.5 26,55.2 29.5,59.8 33,62 40,66.5 52,68 70,70 90,73 110,75 130,73 150,70 162,66 170,65.5 179,65.5 179,64 163,59 156,52 145,44 141,46.5 136,43.5 131.5,42.8 130.6,35.2 129.2,35.3 127.8,34.7 126.2,37.4 126,38.4 124.2,39.6 122.2,37.2 121.2,31.2 122,25.2 119.2,22.8 113,21.6 109.4,18.5 109,13.2 108.6,8.2 105.5,4.5 103.8,1.2 103.2,-1.4 100.2,2.2 99,8 98.2,16.2 94.2,16.4 91.5,20.2 87.6,21.6 80.4,15.8 80,9.8 77.2,8 76.6,10.5 73,15.2 72.6,20.8 69.2,23.2 66.2,25 61.5,25.2 57.6,26.4 58.8,23.2 56.2,22 53.6,16.8 48.5,14.6 43.8,12.6 43,12.8 41.5,16.4 38.6,21 36,25.2 34.6,28.4 34.15,31.3 35.2,33.4 35.8,36.2 32.2,36.4 29.8,36.6 27.2,36.5 24.2,36.8 22.6,37.8 20.6,39.2 18.4,40.4 14.8,40.6 12.2,42 9.6,43.8 7.2,43.7 4.6,43.2 2.8,42.2 0.2,42.8 -1.8,43.2 -5.4,36.1 -8.6,36.8 -9.6,37`),
  ring(`5,58.2 5.2,62 8,64 12,66.2 16,69 20,70.2 25,71 30,70.2 30,64 26,60.5 22,59.4 18,60 14,63.5 12,60 10,58.4 7.2,57.2 5,58.2`),
  ring(`-17,21 -16,15 -17,13 -12,8 -8,4.5 -5,5 1,6 6,4.6 9,4.2 10,1.5 9,-1 13,-6 12,-17 14,-22 17,-28 18.4,-34 20,-34.8 26,-33.8 28.5,-32.6 32.2,-28.8 33.4,-26 35,-20 39,-15 42,-10 43,-2 42,2 43.2,11.2 51.2,11.8 48,7.5 44,1.5 41.5,-2 40,14 36,18 34,26 32.6,31.2 25,31.6 12,32.4 10,33 3,36.8 -2,35.4 -5.6,35.8 -8,33 -10,29 -14,26 -17,21`),
  ring(`113.4,-22 122,-16.4 128,-14.2 136,-12 141.6,-11.2 145.2,-15 149.2,-20.5 153.2,-25.2 153.6,-28.6 151.7,-33.8 150.8,-37.4 146.2,-39.1 144.4,-38.4 140,-38 136.6,-35 129,-32 124,-33.4 115.2,-34.4 115,-31.5 113.6,-26 113.4,-22`),
  ring(`146.4,-41 148.2,-40.8 148.3,-43.2 146.2,-43.4 146.4,-41`),
  ring(`129.6,32.9 130.4,33.3 131.8,34.3 133.4,33.9 135.2,33.7 137.2,34.5 139.2,34.7 141.8,35.2 142.2,36.8 141.5,38.4 140.2,39.6 138.6,38.2 136.6,36.8 134.8,35.6 132.6,35.2 131.2,34.6 130.2,33.7 129.6,33.2 129.6,32.9`),
  ring(`-6,50 -3.2,50.1 0.4,50.7 1.45,51.4 1.55,52.8 0.6,53.6 -0.6,54.8 -1.8,55.6 -2.2,57.8 -4.2,58.6 -5.4,57.2 -5.6,55.2 -4.8,53.2 -5.2,51.4 -4.6,50.6 -6,50`),
  ring(`-10.2,54.6 -8.2,55.2 -6.2,54.2 -6.1,52.2 -8.6,51.5 -10.4,51.8 -10.2,54.6`),
  ring(`43.2,-12.2 50.2,-15.2 47.4,-25.4 43.4,-25 43.2,-16 43.2,-12.2`),
  ring(`174.2,-34.4 178.2,-37.4 178,-39 175.6,-39.2 175.5,-40.8 174.2,-41.15 174.15,-41.65 175.45,-41.65 175.6,-40.6 176.2,-39.6 174.6,-36.4 174.2,-34.4`),
  ring(`166.4,-45.6 168.2,-46.6 170.6,-46.2 171.2,-44.2 169.4,-43.6 167.2,-45 166.4,-45.6`),
  ring(`95.2,5.4 98,4.2 102,-1 105.2,-3.2 104.2,-5.6 98.2,-3.6 95.4,2 95.2,5.4`),
  ring(`109,7 117.2,7 119,4.2 116.4,-2.2 111.2,-3 109,1.5 109,7`),
  ring(`130.6,-1 141,-2.2 147,-6 150.2,-10 145,-9.2 136,-8 131,-4.2 130.6,-1`),
  ring(`122.2,8.8 125.4,9.2 126.6,8.2 126.7,6.6 125.4,5.6 123.4,6.6 122.2,7.6 122.2,8.8`),
  ring(`79.8,9.8 81.8,8.2 81.6,6 80.2,6.2 79.6,8 79.8,9.8`),
];

const HOLES = [
  ring(`27.8,41.2 29.2,41 33,41.2 36.2,41.6 40.2,41.2 41.6,42.2 39.5,43.6 36,44.2 32,44.4 29,43.2 27.8,42 27.8,41.2`),
  ring(`47.2,37 49.2,40.5 50.6,45 53.2,47.2 54,44 52.4,40 50.2,36.8 48.2,36.6 47.2,37`),
];

function project(lon, lat, w, h) {
  return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
}

function pathOf(rings, w, h) {
  return rings
    .map((pts) => {
      const cmds = pts.map(([lon, lat], index) => {
        const [x, y] = project(lon, lat, w, h);
        return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return `${cmds.join("")}Z`;
    })
    .join("");
}

function contains(lon, lat, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function onLand(lon, lat) {
  return LAND.some((pts) => contains(lon, lat, pts));
}

function overlaps(a, b, gap) {
  return !(a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y);
}

function buildMap(w, h) {
  const pins = news.stories
    .filter((story) => story.onMap)
    .map((story) => {
      const [x, y] = project(story.lon, story.lat, w, h);
      return { id: story.id, x, y, color: regionById.get(story.region).color, lon: story.lon, lat: story.lat };
    });

  const used = new Set();
  const clusters = [];
  const ordered = [...pins].sort((a, b) => a.id - b.id);
  for (const pin of ordered) {
    if (used.has(pin.id)) continue;
    const group = [pin];
    used.add(pin.id);
    let grew = true;
    while (grew) {
      grew = false;
      for (const other of ordered) {
        if (used.has(other.id)) continue;
        if (group.some((member) => Math.hypot(member.x - other.x, member.y - other.y) < 8)) {
          group.push(other);
          used.add(other.id);
          grew = true;
        }
      }
    }
    group.sort((a, b) => a.id - b.id);
    clusters.push(group);
  }

  const chipW = 15;
  const chipH = 8;
  const gap = 1;
  const placed = [];
  const chips = [];
  const leaders = [];

  for (const group of clusters) {
    const count = group.length;
    const cols = count > 14 ? 3 : count > 7 ? 2 : 1;
    const rows = Math.ceil(count / cols);
    const stackW = cols * chipW + (cols - 1) * gap;
    const stackH = rows * chipH + (rows - 1) * gap;
    const cx = group.reduce((sum, pin) => sum + pin.x, 0) / count;
    const cy = group.reduce((sum, pin) => sum + pin.y, 0) / count;
    const seeds = [
      [cx + 8, cy - stackH / 2],
      [cx - stackW - 8, cy - stackH / 2],
      [cx - stackW / 2, cy + 8],
      [cx - stackW / 2, cy - stackH - 8],
      [cx + 8, 3],
      [cx - stackW - 8, 3],
      [cx + 8, h - stackH - 3],
      [3, cy - stackH / 2],
      [w - stackW - 3, cy - stackH / 2],
    ];
    let best = null;
    let bestScore = Infinity;
    for (const [sx, sy] of seeds) {
      const rect = {
        x: Math.max(2, Math.min(sx, w - stackW - 2)),
        y: Math.max(2, Math.min(sy, h - stackH - 2)),
        w: stackW,
        h: stackH,
      };
      let score = 0;
      for (const prior of placed) if (overlaps(rect, prior, 2)) score += 12;
      for (const pin of pins) {
        if (group.some((member) => member.id === pin.id)) continue;
        if (pin.x >= rect.x - 4 && pin.x <= rect.x + rect.w + 4 && pin.y >= rect.y - 4 && pin.y <= rect.y + rect.h + 4) {
          score += 4;
        }
      }
      if (score < bestScore) {
        bestScore = score;
        best = rect;
        if (score === 0) break;
      }
    }
    placed.push(best);
    const nearX = Math.max(best.x, Math.min(cx, best.x + best.w));
    const nearY = Math.max(best.y, Math.min(cy, best.y + best.h));
    if (Math.hypot(cx - nearX, cy - nearY) > 6) {
      leaders.push({ x1: cx, y1: cy, x2: nearX, y2: nearY });
    }
    group.forEach((pin, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      chips.push({
        id: pin.id,
        color: pin.color,
        x: best.x + col * (chipW + gap),
        y: best.y + row * (chipH + gap),
      });
    });
  }

  const grat = [];
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = project(lon, 0, w, h);
    grat.push(`<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${h}" stroke="#d5e1eb" stroke-width="0.4"/>`);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = project(0, lat, w, h);
    grat.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="#d5e1eb" stroke-width="0.4"/>`);
  }

  const names = [
    ["PACIFIC", -150, 8],
    ["ATLANTIC", -36, 22],
    ["INDIAN", 78, -22],
  ]
    .map(([label, lon, lat]) => {
      const [x, y] = project(lon, lat, w, h);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#6f8ea3" font-family="Inter, sans-serif" font-size="8" letter-spacing="1.4" text-anchor="middle">${label}</text>`;
    })
    .join("");

  const land = `<path fill="#efe4d2" stroke="#3c3832" stroke-width="0.7" fill-rule="evenodd" d="${pathOf(LAND, w, h)}${pathOf(HOLES, w, h)}"/>`;
  const pinDots = pins
    .map(
      (pin) =>
        `<circle cx="${pin.x.toFixed(1)}" cy="${pin.y.toFixed(1)}" r="4.5" fill="${pin.color}" stroke="#f7f1e6" stroke-width="0.8"/>`,
    )
    .join("");
  const leaderSvg = leaders
    .map(
      (line) =>
        `<line x1="${line.x1.toFixed(1)}" y1="${line.y1.toFixed(1)}" x2="${line.x2.toFixed(1)}" y2="${line.y2.toFixed(1)}" stroke="#5e584e" stroke-width="0.55"/>`,
    )
    .join("");
  const chipSvg = chips
    .map(
      (chip) =>
        `<g><rect x="${chip.x.toFixed(1)}" y="${chip.y.toFixed(1)}" width="15" height="8" rx="0.6" fill="#f7f1e6" stroke="${chip.color}" stroke-width="0.7"/><text x="${(chip.x + 7.5).toFixed(1)}" y="${(chip.y + 6.35).toFixed(1)}" text-anchor="middle" font-family="Inter, sans-serif" font-size="6.4" font-weight="700" fill="${chip.color}">${chip.id}</text></g>`,
    )
    .join("");

  const offLand = pins.filter((pin) => !onLand(pin.lon, pin.lat)).map((pin) => pin.id);
  return {
    svg: `<svg class="map" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><rect width="${w}" height="${h}" fill="#c5d6e4"/><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="#221e18" stroke-width="1"/>${grat.join("")}${land}${names}${pinDots}${leaderSvg}${chipSvg}</svg>`,
    offLand,
    clusters: clusters.map((group) => group.map((pin) => pin.id).join("-")),
  };
}

function leadArt(story) {
  const scenes = {
    1: `<rect width="240" height="112" fill="#e7d3ae"/><rect x="36" y="16" width="128" height="82" fill="#f4ecdc" stroke="#2a241c" stroke-width="1.4"/><rect x="28" y="22" width="128" height="82" fill="#fbf7ef" stroke="#2a241c" stroke-width="1.4"/><path d="M42 40h92M42 50h84M42 60h88M42 70h70" stroke="#c3b496" stroke-width="2"/><rect x="92" y="78" width="58" height="16" fill="#9d2c2c"/><text x="121" y="90" text-anchor="middle" fill="#fff" font-family="Inter, sans-serif" font-size="8" font-weight="700">3RD DRAFT</text><circle cx="188" cy="28" r="3" fill="#9d2c2c"/><circle cx="198" cy="28" r="3" fill="#1e4e8c"/><circle cx="208" cy="28" r="3" fill="#1b7a45"/><circle cx="188" cy="40" r="3" fill="#c45a18"/><circle cx="198" cy="40" r="3" fill="#0e7480"/><circle cx="208" cy="40" r="3" fill="#5c564c"/>`,
    2: `<rect width="240" height="112" fill="#1c2633"/><path d="M18 18C70 62 120 20 156 34" fill="none" stroke="#e2b15a" stroke-width="2"/><path d="M34 12C96 70 150 16 196 30" fill="none" stroke="#f0d48a" stroke-width="2"/><path d="M58 16C120 78 176 22 226 36" fill="none" stroke="#c9843a" stroke-width="2"/><circle cx="156" cy="34" r="3.2" fill="#fff3cc"/><circle cx="196" cy="30" r="3.2" fill="#fff3cc"/><circle cx="226" cy="36" r="3.2" fill="#fff3cc"/><rect y="86" width="240" height="26" fill="#121820"/><rect x="18" y="62" width="16" height="50" fill="#314052"/><rect x="40" y="70" width="22" height="42" fill="#3d4e62"/><rect x="70" y="54" width="14" height="58" fill="#2a3848"/><rect x="92" y="74" width="28" height="38" fill="#46586c"/><rect x="128" y="66" width="12" height="46" fill="#2c3a4c"/><path d="M196 18a10 10 0 1 0 0 16a8 8 0 1 1 0-16z" fill="#f0d48a"/>`,
    3: `<rect width="240" height="112" fill="#d7c4a4"/><path d="M0 96 L40 48 L78 90 L120 36 L168 92 L210 50 L240 96 L240 112 L0 112Z" fill="#8d7352"/><path d="M0 100 L48 62 L86 96 L128 52 L176 98 L240 64 L240 112 L0 112Z" fill="#6d5840"/><path d="M70 78 L92 58 L104 74 L128 40 L146 70" fill="none" stroke="#6b2424" stroke-width="2.2"/><path d="M16 104 H70 l8-8 10 12 12-16 14 20 16-10 H224" fill="none" stroke="#2a241c" stroke-width="1.4"/><text x="16" y="24" fill="#2a241c" font-family="Playfair Display, serif" font-size="20" font-weight="700">M6.7</text>`,
    4: `<rect width="240" height="56" fill="#f7f4ee"/><rect y="56" width="240" height="56" fill="#9d2b2b"/><circle cx="120" cy="56" r="26" fill="none" stroke="#221e18" stroke-width="2"/><path d="M120 34 v44 M98 56 h44 M106 42 l28 28 M134 42 l-28 28" stroke="#221e18" stroke-width="1.5"/><circle cx="120" cy="56" r="4" fill="#221e18"/><rect x="18" y="78" width="18" height="34" fill="#f4efe6"/><rect x="42" y="70" width="14" height="42" fill="#f4efe6"/><rect x="176" y="74" width="16" height="38" fill="#f4efe6"/><rect x="198" y="66" width="22" height="46" fill="#f4efe6"/>`,
  };
  return `<svg viewBox="0 0 240 112" width="100%" height="100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${scenes[story.id]}</svg>`;
}

function midArt(story) {
  const ink = "#221e18";
  const scenes = {
    5: `<rect width="200" height="54" fill="#d9e4f2"/><text x="12" y="40" fill="#1e4e8c" font-family="Playfair Display, serif" font-size="32" font-weight="700">148</text><path d="M120 16 h18 l-4-4 M138 16 l-4 4 M120 28 h22 l-4-4 M142 28 l-4 4 M120 40 h16 l-4-4 M136 40 l-4 4" fill="none" stroke="#1e4e8c" stroke-width="1.4"/>`,
    8: `<rect width="200" height="54" fill="#e7eef8"/><text x="12" y="38" fill="#1e4e8c" font-family="Playfair Display, serif" font-size="28" font-weight="700">€1.78tn</text><rect x="148" y="30" width="10" height="16" fill="#1e4e8c"/><rect x="162" y="22" width="10" height="24" fill="#8aa4c8"/><rect x="176" y="14" width="10" height="32" fill="#1e4e8c"/>`,
    7: `<rect width="200" height="54" fill="#e4e7f4"/><rect x="16" y="10" width="70" height="34" fill="#fbf7ef" stroke="${ink}" stroke-width="1.3"/><path d="M28 20h46M28 28h40M28 36h28" stroke="#c3b496" stroke-width="1.6"/><path d="M118 12 l22 30 M140 12 l-22 30" stroke="#9d2c2c" stroke-width="3"/><rect x="156" y="14" width="22" height="16" rx="3" fill="none" stroke="${ink}" stroke-width="1.4"/><path d="M160 30 v8 M174 30 v8 M158 38 h18" stroke="${ink}" stroke-width="1.4"/>`,
    13: `<rect width="200" height="54" fill="#f6d5d1"/><text x="12" y="38" fill="#a32020" font-family="Playfair Display, serif" font-size="30" font-weight="700">146</text><path d="M124 34 h46 l-10-8 v-6 h-8 v6 l-8 4 z" fill="#a32020"/><path d="M150 34 v8" stroke="#a32020" stroke-width="1.5"/><circle cx="138" cy="43" r="2" fill="#a32020"/><circle cx="164" cy="43" r="2" fill="#a32020"/>`,
    25: `<rect width="200" height="54" fill="#f8dcc8"/><text x="14" y="40" fill="#c45a18" font-family="Playfair Display, serif" font-size="32" font-weight="700">11</text><rect x="132" y="16" width="22" height="26" rx="4" fill="none" stroke="#c45a18" stroke-width="1.8"/><rect x="138" y="10" width="10" height="8" fill="#c45a18"/><path d="M168 40 l10-22 10 22 z" fill="none" stroke="#9d2c2c" stroke-width="1.6"/>`,
    26: `<rect width="200" height="54" fill="#f3e1cf"/><path d="M16 40 l18-16 18 16 v8 h-36z M70 40 l18-16 18 16 v8 h-36z M124 40 l18-16 18 16 v8 h-36z" fill="#c45a18"/><rect x="150" y="18" width="36" height="8" fill="#9d2c2c"/>`,
    14: `<rect width="200" height="54" fill="#d5efef"/><rect x="18" y="12" width="3" height="28" fill="#0e7480"/><rect x="28" y="12" width="3" height="28" fill="#0e7480"/><rect x="38" y="12" width="3" height="28" fill="#0e7480"/><rect x="16" y="38" width="28" height="3" fill="#0e7480"/><text x="62" y="38" fill="#0e7480" font-family="Playfair Display, serif" font-size="26" font-weight="700">486-4</text>`,
    46: `<rect width="200" height="54" fill="#e6e2da"/><circle cx="46" cy="28" r="16" fill="#8d8478"/><circle cx="40" cy="24" r="5" fill="#6e675e"/><path d="M92 34 h28 l6-8 h10 v8 h8" fill="none" stroke="#5c564c" stroke-width="1.6"/><circle cx="148" cy="26" r="5" fill="none" stroke="#5c564c" stroke-width="1.4"/><path d="M70 18c30-16 70-8 96 6" fill="none" stroke="#a32020" stroke-width="1.2" stroke-dasharray="3 2"/>`,
    49: `<rect width="200" height="54" fill="#d9e4f2"/><text x="12" y="38" fill="#1e4e8c" font-family="Playfair Display, serif" font-size="28" font-weight="700">37–12</text><ellipse cx="156" cy="28" rx="16" ry="10" fill="none" stroke="#1e4e8c" stroke-width="1.8"/><path d="M150 28 h12 M156 23 v10" stroke="#1e4e8c" stroke-width="1.2"/>`,
    34: `<rect width="200" height="54" fill="#d9dcf0"/><text x="12" y="24" fill="#2c3e86" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="1">POLE</text><text x="12" y="44" fill="#2c3e86" font-family="Playfair Display, serif" font-size="18" font-weight="700">1 VER</text>${Array.from({ length: 8 }, (_, i) => `<rect x="${128 + i * 8}" y="40" width="8" height="8" fill="${i % 2 ? "#f7f1e6" : "#221e18"}"/>`).join("")}`,
  };
  return `<svg viewBox="0 0 200 54" width="100%" height="54" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${scenes[story.id]}</svg>`;
}

function card(story, kind) {
  const region = regionById.get(story.region);
  const art = kind === "lead" ? leadArt(story) : midArt(story);
  const title = kind === "lead" ? "h2" : "h3";
  return `<article class="${kind}"><div class="strip" style="background:${region.color}"></div><div class="art">${art}</div><div class="body"><div class="kh"><span class="num" style="background:${region.color}">${story.id}</span><span>${esc(story.where)} · ${esc(story.topic)}</span></div><${title}>${esc(story.headline)}</${title}><p>${esc(story.dek)}</p><div class="meta"><span>${esc(story.sources)}</span><b>${esc(story.tag)}</b></div></div></article>`;
}

function briefColumns() {
  return COLS.map((ids) => {
    const blocks = ids
      .map((id) => {
        const region = regionById.get(id);
        const items = news.stories
          .filter((story) => story.role === "brief" && story.region === id)
          .sort((a, b) => a.id - b.id)
          .map(
            (story) =>
              `<p class="brief"><b class="bn" style="color:${region.color}">${story.id}</b> ${esc(story.text)} <span class="bs">${esc(story.sources)}</span> <b class="tg">${SHORT[story.tag]}</b></p>`,
          )
          .join("");
        return `<div class="group"><div class="rh" style="color:${region.color}"><span>${esc(region.name)}</span></div>${items}</div>`;
      })
      .join("");
    return `<div class="bcol">${blocks}</div>`;
  }).join("");
}

function ticks() {
  const span = news.tickEnd - news.tickStart;
  const seen = new Set();
  const marks = [];
  const placed = news.ticks.map((tick) => {
    const frac = (tick.hour - news.tickStart) / span;
    const x = frac * 992;
    const key = tick.hour.toFixed(2);
    if (!seen.has(key)) {
      seen.add(key);
      marks.push(`<i style="left:${x.toFixed(1)}px"></i>`);
    }
    const wide = Math.max(tick.time.length, tick.label.length) * 4.1;
    return { ...tick, x, wide, shift: 0 };
  });
  const sorted = [...placed].sort((a, b) => a.x - b.x || a.side.localeCompare(b.side));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const prevX = prev.x + prev.shift;
    const curX = cur.x + cur.shift;
    if (prev.side === cur.side) {
      const prevRight = prevX + prev.wide / 2;
      const curLeft = curX - cur.wide / 2;
      const need = prevRight + 6 - curLeft;
      if (need > 0) cur.shift += need;
    } else if (Math.abs(prev.hour - cur.hour) > 0.05 && Math.abs(prevX - curX) < 22) {
      const need = 22 - Math.abs(prevX - curX);
      cur.shift += need / 2;
      prev.shift -= need / 2;
    }
  }
  for (const tick of placed) {
    const left = tick.x + tick.shift - tick.wide / 2;
    const right = tick.x + tick.shift + tick.wide / 2;
    if (left < 0) tick.shift -= left;
    if (right > 992) tick.shift -= right - 992;
  }
  const labels = placed.map(
    (tick) =>
      `<div class="tick ${tick.side}" style="left:${(tick.x + tick.shift).toFixed(1)}px"><b>${esc(tick.time)}</b><br>${esc(tick.label)}</div>`,
  );
  return `<div class="axis"></div>${marks.join("")}${labels.join("")}`;
}

function regionBar() {
  return news.regions
    .map(
      (region) =>
        `<div class="seg" style="flex:${region.count};background:${region.color}"><span>${esc(region.name)}</span><b>${region.count}</b></div>`,
    )
    .join("");
}

function kpiRow() {
  return news.kpis
    .map((chip) => `<div class="chip"><span>${esc(chip.label)}</span><b>${esc(chip.value)}</b></div>`)
    .join("");
}

assertEdition();
const mapW = 336;
const mapH = 176;
const map = buildMap(mapW, mapH);
if (!dry) {
  console.log("clusters", map.clusters.join(" "));
  console.log("off-land pins", map.offLand.join(","));
} else {
  console.log("off-land", map.offLand.join(","));
  console.log("clusters", map.clusters.join(" "));
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Saturday 21 November 2026</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 1024px; height: 1024px; overflow: hidden; background: #f4efe4; }
  #sheet {
    position: relative;
    width: 1024px;
    height: 1024px;
    overflow: hidden;
    background: linear-gradient(#f7f1e6, #f4efe4);
    color: #1c1915;
    font-family: Inter, "Source Sans 3", "Source Sans Pro", Roboto, sans-serif;
  }
  .band { position: absolute; left: 16px; width: 992px; }
  .kicker { top: 16px; height: 22px; display: flex; justify-content: space-between; align-items: center; }
  .kicker b { font-size: 9px; line-height: 1.15; letter-spacing: 0.16em; font-weight: 700; }
  .kicker span { font-size: 8px; line-height: 1.3; letter-spacing: 0.04em; font-weight: 600; }
  .date {
    top: 38px; height: 66px;
    font-family: "Playfair Display", "Source Serif Pro", serif;
    font-size: 56px; line-height: 1.16; font-weight: 700;
    letter-spacing: -0.01em; color: #16130f;
    border-bottom: 2px solid #221e18;
    display: flex; align-items: center;
    white-space: nowrap;
  }
  .kpis { top: 104px; height: 24px; display: flex; gap: 6px; }
  .chip {
    flex: 1; min-width: 0; height: 24px;
    border: 1px solid #221e18; background: #fbf8f2;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 6px; font-size: 8px; line-height: 1.3;
  }
  .chip b { font-family: "Playfair Display", "Source Serif Pro", serif; font-size: 12px; font-weight: 700; line-height: 1.15; letter-spacing: -0.01em; }
  .utc { top: 128px; height: 48px; }
  .utc .axis { position: absolute; left: 0; right: 0; top: 24px; height: 1px; background: #221e18; }
  .utc i { position: absolute; top: 19px; width: 1px; height: 11px; background: #221e18; }
  .tick { position: absolute; transform: translateX(-50%); text-align: center; font-size: 7px; line-height: 1.25; white-space: nowrap; }
  .tick.up { top: 5px; }
  .tick.down { top: 26px; }
  .regions { top: 176px; height: 22px; display: flex; }
  .seg { min-width: 0; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 4px; font-size: 7.5px; font-weight: 700; line-height: 1.25; letter-spacing: 0; }
  .leads { top: 198px; height: 180px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .mids { top: 378px; height: 256px; display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: 126px 126px; gap: 4px 6px; }
  .lead, .mid { border: 1px solid #221e18; background: #fbf8f2; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .strip { height: 4px; flex: none; }
  .art { flex: none; background: #efe6d4; }
  .lead .art { height: 100px; }
  .mid .art { height: 54px; }
  .body { padding: 8px 7px; display: flex; flex-direction: column; justify-content: center; min-height: 0; flex: 1; }
  .kh { display: flex; align-items: center; gap: 4px; font-size: 7.5px; font-weight: 700; letter-spacing: 0.04em; line-height: 1.25; }
  .num { width: 11px; height: 11px; color: #fff; font-size: 7px; line-height: 11px; text-align: center; font-weight: 700; flex: none; }
  .lead h2, .mid h3 {
    font-family: "Playfair Display", "Source Serif Pro", serif;
    font-weight: 700; color: #16130f; margin: 0; letter-spacing: -0.01em;
  }
  .lead h2 { font-size: 16px; line-height: 1.17; }
  .mid h3 { font-size: 13px; line-height: 1.16; }
  .lead p { margin: 4px 0 0; font-size: 9px; line-height: 1.32; }
  .mid p { margin: 3px 0 0; font-size: 8px; line-height: 1.3; }
  .meta { margin-top: 0; display: flex; justify-content: space-between; gap: 6px; font-size: 7.5px; line-height: 1.25; }
  .meta span { min-width: 0; }
  .meta b { font-weight: 800; letter-spacing: 0.04em; flex: none; }
  .bottom { top: 634px; height: 286px; }
  .btitle { height: 12px; display: flex; align-items: center; }
  .btitle b { font-size: 8px; line-height: 1.25; letter-spacing: 0.06em; font-weight: 800; }
  .maptitle { width: 344px; }
  .bbody { height: 274px; display: flex; gap: 8px; }
  .mapcol { width: 336px; flex: none; }
  .notes { margin-top: 10px; font-size: 8px; line-height: 1.35; }
  .notes p { margin: 0 0 2px; }
  .briefcols { flex: 1; min-width: 0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .bcol { min-width: 0; }
  .rh { display: flex; justify-content: space-between; align-items: center; font-size: 8px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; border-bottom: 1px solid currentColor; line-height: 1.25; margin: 0 0 1px; }
  .group { margin: 0; }
  .brief { margin: 0 0 2px; font-size: 7px; line-height: 1.25; }
  .bn { font-weight: 800; }
  .bs { color: #4a453e; }
  .tg { font-weight: 800; letter-spacing: 0.03em; }
  .check {
    top: 920px; height: 68px;
    background: #8e1c1c; color: #fff;
    padding: 6px 8px;
  }
  .check b { display: block; font-size: 14px; line-height: 1.15; letter-spacing: 0; font-weight: 800; }
  .check p { margin: 3px 0 0; font-size: 7px; line-height: 1.3; }
  .foot { top: 988px; height: 20px; display: flex; align-items: center; font-size: 7.5px; line-height: 1.3; white-space: nowrap; }
</style>
</head>
<body>
<div id="sheet">
  <div class="band kicker"><b>${esc(news.kicker)}</b><span>${esc(news.standfirst)}</span></div>
  <div class="band date">${esc(news.date)}</div>
  <div class="band kpis">${kpiRow()}</div>
  <div class="band utc">${ticks()}</div>
  <div class="band regions">${regionBar()}</div>
  <div class="band leads">${LEADS.map((id) => card(byId.get(id), "lead")).join("")}</div>
  <div class="band mids">${MIDS.map((id) => card(byId.get(id), "mid")).join("")}</div>
  <div class="band bottom">
    <div class="btitle"><b class="maptitle">WHERE IT HAPPENED</b><b>ALSO ON SATURDAY 21 NOVEMBER</b></div>
    <div class="bbody">
      <div class="mapcol">${map.svg}<div class="notes"><p>${esc(news.offMap)}</p><p>${esc(news.asteriskNote)}</p><p>${esc(news.sure)}</p></div></div>
      <div class="briefcols">${briefColumns()}</div>
    </div>
  </div>
  <div class="band check"><b>DATE CHECK</b><p>${esc(news.dateCheck)}</p></div>
  <div class="band foot">${esc(news.footer)}</div>
</div>
</body>
</html>`;

const htmlPath = join(here, "poster.html");
writeFileSync(htmlPath, html);
console.log("html-bytes", Buffer.byteLength(html));
if (dry) process.exit(0);

const shot = join(here, "raw-shot.png");
const entry = join(root, "entry.png");
const preview = join(here, "preview-300.png");
const chrome = spawnSync(
  "google-chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1024,1024",
    `--screenshot=${shot}`,
    htmlPath,
  ],
  { encoding: "utf8" },
);
if (chrome.status !== 0) {
  console.error(chrome.stdout);
  console.error(chrome.stderr);
  throw new Error(`chrome exit ${chrome.status}`);
}

const py = `
from PIL import Image
import os, sys
src, entry, preview = sys.argv[1:]
im = Image.open(src).convert("RGB")
print("shot", im.size[0], im.size[1])
if im.size != (1024, 1024):
    w, h = im.size
    if w >= 1024 and h >= 1024:
        im = im.crop((0, 0, 1024, 1024))
    else:
        canvas = Image.new("RGB", (1024, 1024), (244, 239, 228))
        canvas.paste(im, (0, 0))
        im = canvas
im.save(entry, "PNG", optimize=True)
im.resize((300, 300), Image.Resampling.LANCZOS).save(preview, "PNG", optimize=True)
print("entry-bytes", os.path.getsize(entry))
print("preview-bytes", os.path.getsize(preview))
`;
const fitted = spawnSync("python3", ["-", shot, entry, preview], { input: py, encoding: "utf8" });
if (fitted.status !== 0) {
  console.error(fitted.stderr);
  throw new Error("png fit failed");
}
process.stdout.write(fitted.stdout);
unlinkSync(shot);
const info = statSync(entry);
console.log("entry", entry, info.size);
