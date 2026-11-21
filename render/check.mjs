/**
 * Assert entry.png and write render/preview-300.png.
 * Run from render/build.mjs, or directly: node render/check.mjs
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const LIMIT = 1048576;
const SIG = '89504e470d0a1a0a';

function assertPng(path) {
  const buf = readFileSync(path);
  const size = statSync(path).size;
  if (buf.length !== size) throw new Error(`${path} size mismatch`);
  if (buf.subarray(0, 8).toString('hex') !== SIG) throw new Error(`${path} is not a PNG`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width !== 1024 || height !== 1024) {
    throw new Error(`${path} is ${width}x${height}, expected 1024x1024`);
  }
  if (size > LIMIT) throw new Error(`${path} is ${size} bytes, over 1 MiB`);
  return { width, height, size };
}

function preview(src, dest) {
  const py = `
from PIL import Image
im = Image.open(${JSON.stringify(src)}).convert("RGB")
w = 300
h = round(im.height * 300 / im.width)
im = im.resize((w, h), Image.Resampling.LANCZOS)
im.save(${JSON.stringify(dest)}, format="PNG", optimize=True, compress_level=9)
`;
  const r = spawnSync('python3', ['-c', py], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`preview failed for ${src}`);
}

const src = join(root, 'entry.png');
const info = assertPng(src);
const dest = join(here, 'preview-300.png');
preview(src, dest);
const prev = statSync(dest);
if (prev.size < 1000) throw new Error('preview looks empty');
console.log(`${src} ${info.width}x${info.height} ${info.size} bytes`);
console.log(`${dest} 300px wide ${prev.size} bytes`);
console.log('checks ok');
