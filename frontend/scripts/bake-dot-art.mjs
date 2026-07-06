/**
 * Bake the user's hand-typed dot-art portrait (`dot_art_img.txt` at the
 * project root) into a JSON of per-dot positions for the canvas-based
 * hero brand mark.
 *
 * The text file contains lines × 100 characters of braille-pattern
 * codepoints (U+2800..U+28FF). Each braille character encodes a 2-column ×
 * 4-row sub-grid of dots, so the underlying image is 100×2 = 200 columns
 * wide and `lines × 4` rows tall — a square 200×200 dot field.
 *
 * The bake emits a single JSON file with:
 *   - width, height
 *   - color (mint tint matching the site palette)
 *   - dotRadius (relative, used for a soft hint)
 *   - positions: array of [nx, ny] pairs in 0..1 normalised space (centred)
 *
 * The frontend `PortraitFrame` component fetches this JSON and renders the
 * dots on a 2D canvas with a mouse-repel effect. There is no PNG.
 *
 * The actual braille-parsing logic lives in
 * `lib/portrait/dotArt.mjs` so the admin upload route can reuse it without
 * running a separate build step.
 *
 * Run:
 *   cd frontend
 *   node scripts/bake-dot-art.mjs
 *
 * Re-run only when `dot_art_img.txt` changes. Not part of `npm run build`.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDotArtToJson } from '../lib/portrait/dotArt.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Paths ---------------------------------------------------------------
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(REPO_ROOT, 'dot_art_img.txt');
const OUT_JSON = path.join(
  __dirname,
  '..',
  'public',
  'portrait',
  'PictureonNAS.particles.json',
);

// ---- CLI entry ---------------------------------------------------------
async function main() {
  const t0 = Date.now();
  const srcPath = process.argv[2] ?? SRC;
  const outPath = process.argv[3] ?? OUT_JSON;
  console.log(`[bake] reading source: ${srcPath}`);
  const text = await readFile(srcPath, 'utf8');
  const data = parseDotArtToJson(text);
  console.log(
    `[bake] parsed ${data.positions.length} dot positions (normalised 0..1, centred in 200×200)`,
  );

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(data));
  console.log(`[bake] wrote ${outPath}`);
  console.log(`[bake] done in ${Date.now() - t0}ms`);
}

// `isMain` is true only when this file is the entrypoint (e.g.
// `node scripts/bake-dot-art.mjs`). When imported by the admin upload
// route via dynamic import, `process.argv[1]` is something else.
const isMain =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error('[bake] failed:', err);
    process.exit(1);
  });
}
