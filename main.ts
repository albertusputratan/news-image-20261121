import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'entry.png');
const destDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(destDir, { recursive: true });
const dest = join(destDir, 'entry.png');
copyFileSync(src, dest);
