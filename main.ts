// Hands the Saturday 21 November 2026 sheet to the make.fun output folder.
import * as disk from 'node:fs';
import * as where from 'node:path';

const sheetPath = where.join(import.meta.dirname, 'entry.png');
const dropFolder = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
disk.mkdirSync(dropFolder, { recursive: true });
disk.copyFileSync(sheetPath, where.join(dropFolder, 'entry.png'));
