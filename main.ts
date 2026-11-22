// Saturday 21 November 2026 — copy the broadsheet plate into the make.fun output folder.
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const destDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const sourcePng = join(here, "entry.png");
const targetPng = join(destDir, "entry.png");

await mkdir(destDir, { recursive: true });
await copyFile(sourcePng, targetPng);
