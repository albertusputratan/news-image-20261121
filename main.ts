// Saturday 21 November 2026 — copy this folder's entry.png into the output dir.
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

await mkdir(outputDir, { recursive: true });
await copyFile(join(scriptDir, "entry.png"), join(outputDir, "entry.png"));
