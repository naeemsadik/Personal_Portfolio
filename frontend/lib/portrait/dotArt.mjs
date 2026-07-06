/**
 * Parse a hand-typed braille-art text file into a per-dot positions JSON
 * payload, used by both:
 *
 *  - `scripts/bake-dot-art.mjs` (one-off CLI, re-run when dot_art_img.txt
 *    changes at the repo root, writes `public/portrait/PictureonNAS.particles.json`)
 *  - `app/api/portrait/upload/route.ts` (admin uploads a new text file, server
 *    parses it and overwrites the same JSON file)
 *
 * The text file is lines × 100 characters of braille-pattern codepoints
 * (U+2800..U+28FF). Each braille character encodes a 2-column × 4-row
 * sub-grid of dots (Unicode Standard Annex #24). The parser produces:
 *
 *   {
 *     width: 1024,
 *     height: 1024,
 *     color: "rgba(124, 245, 179, 0.95)",
 *     dotRadius: 0.42,
 *     positions: [[nx, ny], ...]   // normalised 0..1, centred in 200×200
 *   }
 *
 * The runtime `PortraitFrame` canvas reads this JSON and renders dots with a
 * mouse-repel effect.
 */

// ---- Config --------------------------------------------------------------
const ACCENT = { r: 124, g: 245, b: 179 }; // site mint
const ALPHA = 0.95;
const DOT_RADIUS = 0.42;

// ---- Braille bit decoding -----------------------------------------------
// A braille codepoint C encodes 8 dots via C - 0x2800. Per Unicode Standard
// Annex #24 the bit layout for the 8-dot pattern is:
//   bit 0  dot 1   bit 3  dot 4
//   bit 1  dot 2   bit 4  dot 5
//   bit 2  dot 3   bit 5  dot 6
//   bit 6  dot 7   bit 7  dot 8
// Dot positions (row, col) within the 2x4 cell:
//   col 0            col 1
//   row 0: dot 1     dot 4
//   row 1: dot 2     dot 5
//   row 2: dot 3     dot 6
//   row 3: dot 7     dot 8
const DOT_POSITIONS = [
  [0, 0, 0], // dot 1
  [1, 1, 0], // dot 2
  [2, 2, 0], // dot 3
  [3, 0, 1], // dot 4
  [4, 1, 1], // dot 5
  [5, 2, 1], // dot 6
  [6, 3, 0], // dot 7
  [7, 3, 1], // dot 8
];

function decodeBraille(cp) {
  if (cp < 0x2800 || cp > 0x28ff) return [];
  const bits = cp - 0x2800;
  const out = [];
  for (const [bit, row, col] of DOT_POSITIONS) {
    if (bits & (1 << bit)) out.push([row, col]);
  }
  return out;
}

/**
 * Parse a braille-art text buffer into a positions JSON payload.
 *
 * @param {string} text  Raw text content of the braille-art file.
 * @param {{ accent?: {r:number,g:number,b:number}; alpha?: number; dotRadius?: number }} [opts]
 * @returns {{ width: number, height: number, color: string, dotRadius: number, positions: [number, number][] }}
 */
export function parseDotArtToJson(text, opts = {}) {
  const accent = opts.accent ?? ACCENT;
  const alpha = opts.alpha ?? ALPHA;
  const dotRadius = opts.dotRadius ?? DOT_RADIUS;

  // Strip \r, drop leading/trailing blank lines, preserve interior rows.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('Empty file — no dot rows found.');
  }

  // Determine the dominant line width so the output is rectangular.
  const widthChars = Math.max(...lines.map((l) => [...l].length));
  const heightChars = lines.length;
  const widthDots = widthChars * 2;
  const heightDots = heightChars * 4;

  // Boolean grid of "on" dots.
  const grid = new Uint8Array(widthDots * heightDots);
  let onCount = 0;

  for (let row = 0; row < heightChars; row++) {
    const chars = [...lines[row]];
    for (let col = 0; col < widthChars; col++) {
      const ch = chars[col];
      const cp = ch ? ch.codePointAt(0) ?? 0x2800 : 0x2800;
      const dots = decodeBraille(cp);
      for (const [dr, dc] of dots) {
        const x = col * 2 + dc;
        const y = row * 4 + dr;
        if (x < widthDots && y < heightDots) {
          grid[y * widthDots + x] = 1;
          onCount++;
        }
      }
    }
  }

  if (onCount === 0) {
    throw new Error('No dots found — is this a braille-art text file?');
  }

  // Normalise to 0..1, centred. The square 200×200 is the canonical canvas.
  const maxDim = Math.max(widthDots, heightDots);
  const positions = [];
  for (let y = 0; y < heightDots; y++) {
    for (let x = 0; x < widthDots; x++) {
      if (grid[y * widthDots + x]) {
        positions.push([
          (x + 0.5) / maxDim,
          (y + 0.5) / maxDim,
        ]);
      }
    }
  }

  return {
    width: 1024,
    height: 1024,
    color: `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha})`,
    dotRadius,
    positions,
  };
}

export const DEFAULT_ACCENT = ACCENT;
export const DEFAULT_ALPHA = ALPHA;
export const DEFAULT_DOT_RADIUS = DOT_RADIUS;
