/**
 * /api/portrait/upload — admin only.
 *
 * Accepts a `.txt` braille-art file from the admin Hero editor, parses it
 * into a per-dot positions JSON via the same algorithm used by
 * `scripts/bake-dot-art.mjs`, and writes the result to
 * `public/portrait/PictureonNAS.particles.json`. The `PortraitFrame`
 * client component fetches that JSON and renders the dot grid.
 *
 * Contract:
 *   POST multipart/form-data with `file` field.
 *   200 -> { url: "/portrait/PictureonNAS.particles.json", dotCount: number }
 *   400 -> { error: string }            // not a file, parse error, etc.
 *   401 -> { error: 'unauthorized' }
 *   413 -> { error: 'File too large' }
 */
import { NextResponse } from 'next/server';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { getSessionToken } from '@/lib/api/cookie';
// Static import — the parser is a plain ESM .mjs file under `lib/portrait/`.
// Static imports let webpack resolve the dependency at build time without
// the "request of a dependency is an expression" warning, and Next.js
// bundles it into the server chunk correctly.
import { parseDotArtToJson } from '@/lib/portrait/dotArt.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 256 * 1024; // 256 KB — braille text is tiny

// Where we write the baked JSON. Lives in `public/` so Next.js serves it
// directly as a static asset (no API roundtrip for the visitor).
const PUBLIC_PORTRAIT_DIR = path.join(process.cwd(), 'public', 'portrait');
const OUT_FILENAME = 'PictureonNAS.particles.json';
const OUT_PATH = path.join(PUBLIC_PORTRAIT_DIR, OUT_FILENAME);
const OUT_URL = `/portrait/${OUT_FILENAME}`;

export async function POST(req: Request) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File too large (max 256 KB)' },
      { status: 413 },
    );
  }

  // Cheap guard — must look like a text file. The real check is whether
  // the parser finds braille codepoints (U+2800..U+28FF).
  if (!/text\/|\.txt$|braille|dot[_-]?art/i.test(file.type + ' ' + file.name)) {
    return NextResponse.json(
      {
        error:
          'Expected a .txt braille-art file. Got type "' +
          (file.type || 'unknown') +
          '".',
      },
      { status: 400 },
    );
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return NextResponse.json({ error: 'Could not read file' }, { status: 400 });
  }

  // Parse via the shared parser imported at the top of the file. Returning
  // a clean JSON parse error is friendlier than a 500.
  let parsed: {
    width: number;
    height: number;
    color: string;
    dotRadius: number;
    positions: [number, number][];
  };
  try {
    parsed = parseDotArtToJson(text) as typeof parsed;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Parse failed' },
      { status: 400 },
    );
  }

  try {
    await mkdir(PUBLIC_PORTRAIT_DIR, { recursive: true });
    await writeFile(OUT_PATH, JSON.stringify(parsed));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Write failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: OUT_URL, dotCount: parsed.positions.length });
}
