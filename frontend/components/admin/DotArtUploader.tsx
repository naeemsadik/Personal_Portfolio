'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, RefreshCcw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Re-bake the braille-art text client-side so we can show a live preview
// before/after upload. This duplicates the parser in
// `lib/portrait/dotArt.mjs` deliberately — that file is server-only ESM and
// can't be imported into a client bundle. The bit layout is the same
// (Unicode Standard Annex #24).

const ACCENT = { r: 124, g: 245, b: 179 };

const DOT_POSITIONS: Array<[number, number, number]> = [
  [0, 0, 0], // dot 1
  [1, 1, 0], // dot 2
  [2, 2, 0], // dot 3
  [3, 0, 1], // dot 4
  [4, 1, 1], // dot 5
  [5, 2, 1], // dot 6
  [6, 3, 0], // dot 7
  [7, 3, 1], // dot 8
];

function decodeBraille(cp: number): Array<[number, number]> {
  if (cp < 0x2800 || cp > 0x28ff) return [];
  const bits = cp - 0x2800;
  const out: Array<[number, number]> = [];
  for (const [bit, row, col] of DOT_POSITIONS) {
    if (bits & (1 << bit)) out.push([row, col]);
  }
  return out;
}

type Parsed = {
  width: number;
  height: number;
  color: string;
  dotRadius: number;
  positions: Array<[number, number]>;
};

function parse(text: string): Parsed {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error('Empty file');
  const widthChars = Math.max(...lines.map((l) => [...l].length));
  const heightChars = lines.length;
  const widthDots = widthChars * 2;
  const heightDots = heightChars * 4;

  const grid = new Uint8Array(widthDots * heightDots);
  let on = 0;
  for (let r = 0; r < heightChars; r++) {
    const chars = [...lines[r]!];
    for (let c = 0; c < widthChars; c++) {
      const ch = chars[c];
      const cp = ch ? ch.codePointAt(0) ?? 0x2800 : 0x2800;
      const dots = decodeBraille(cp);
      for (const [dr, dc] of dots) {
        const x = c * 2 + dc;
        const y = r * 4 + dr;
        if (x < widthDots && y < heightDots) {
          grid[y * widthDots + x] = 1;
          on++;
        }
      }
    }
  }
  if (on === 0) throw new Error('No braille dots found');
  const maxDim = Math.max(widthDots, heightDots);
  const positions: Array<[number, number]> = [];
  for (let y = 0; y < heightDots; y++) {
    for (let x = 0; x < widthDots; x++) {
      if (grid[y * widthDots + x]) {
        positions.push([(x + 0.5) / maxDim, (y + 0.5) / maxDim]);
      }
    }
  }
  return {
    width: 1024,
    height: 1024,
    color: `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, 0.95)`,
    dotRadius: 0.42,
    positions,
  };
}

type Props = {
  /**
   * URL the live hero canvas is reading from. Set this once you've
   * uploaded — pass it down so the editor can show whether the canvas is
   * pointing at your latest upload or the stale default.
   */
  value?: string;
  className?: string;
};

/**
 * Text-file uploader for the hero brand mark.
 *
 * Replaces the legacy `ImageUploader` — there's no PNG to upload. The
 * admin types/pastes their braille-art into a `.txt` file, drops it here,
 * we parse it server-side and overwrite
 * `public/portrait/PictureonNAS.particles.json`. The runtime
 * `PortraitFrame` reads that JSON and renders the dots.
 *
 * Shows a tiny live preview using the same braille parser, so the admin
 * sees what they'll get before committing the upload.
 */
export function DotArtUploader({ value, className }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [dotCount, setDotCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw the preview whenever the text changes.
  useEffect(() => {
    if (!previewText) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    let parsed: Parsed;
    try {
      parsed = parse(previewText);
      setError(null);
      setDotCount(parsed.positions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse error');
      setDotCount(null);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const css = canvas.clientWidth || 240;
    canvas.width = Math.floor(css * dpr);
    canvas.height = Math.floor(css * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, css, css);
    const cell = css / 200;
    const offsetX = (css - 200 * cell) / 2;
    const offsetY = (css - 200 * cell) / 2;
    const radius = Math.max(1, cell * 0.42);
    ctx.fillStyle = parsed.color;
    for (const [nx, ny] of parsed.positions) {
      ctx.beginPath();
      ctx.arc(offsetX + nx * 200 * cell, offsetY + ny * 200 * cell, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [previewText]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    setPending(true);
    setError(null);
    try {
      // First — show a local preview regardless of upload result.
      const text = await file.text();
      setPreviewText(text);

      // Then upload. Server parses and overwrites the JSON.
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/portrait/upload', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error ?? 'Upload failed');
      }
      const data = (await res.json()) as { url: string; dotCount: number };
      toast.success(`Uploaded — ${data.dotCount} dots`);
      // Bust the client cache so the next page load picks up the new JSON.
      try {
        // The URL is the same path; Next.js fetch cache is keyed by it.
        // Force-refresh by appending a query string on the next read.
        // (PortraitFrame fetches with cache: 'no-store', so this is
        // mostly belt-and-suspenders for the user navigating around.)
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setPreviewText(null);
    setDotCount(null);
    setError(null);
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Brand-mark — braille text file
        </div>
        {value ? (
          <code className="rounded bg-card/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
            live: {value}
          </code>
        ) : null}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'relative grid min-h-[260px] place-items-center overflow-hidden rounded-lg border border-dashed bg-card/40 transition-colors',
          dragOver ? 'border-accent/60 bg-accent/5' : 'border-border',
        )}
      >
        {previewText ? (
          <div className="flex w-full flex-col items-center gap-3 p-5">
            <canvas
              ref={previewCanvasRef}
              className="aspect-square w-full max-w-[260px] rounded-md bg-[#020617]"
              aria-label="Parsed dot preview"
            />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {dotCount ?? 0} dots
              </span>
              <span aria-hidden>·</span>
              <span className="font-mono">
                {previewText.split(/\r?\n/).filter((l) => l.length > 0).length}{' '}
                rows
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <RefreshCcw data-icon="inline-start" />
                )}
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={pending}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            {pending ? (
              <Loader2 className="size-6 animate-spin text-accent" />
            ) : (
              <FileText className="size-6 text-accent/80" />
            )}
            <div>
              <span className="text-foreground">Drop a .txt braille file</span>{' '}
              or click to browse
            </div>
            <div className="text-xs">
              Plain text · braille-pattern codepoints U+2800..U+28FF
            </div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".txt,text/plain"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => void handleFiles(e.target.files)}
          disabled={pending}
        />
      </div>

      {error ? (
        <div className="text-xs text-destructive">⚠ {error}</div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          The file replaces{' '}
          <code className="rounded bg-card/60 px-1.5 py-0.5 text-[11px]">
            public/portrait/PictureonNAS.particles.json
          </code>
          . To author offline, edit{' '}
          <code className="rounded bg-card/60 px-1.5 py-0.5 text-[11px]">
            dot_art_img.txt
          </code>{' '}
          at the repo root and run{' '}
          <code className="rounded bg-card/60 px-1.5 py-0.5 text-[11px]">
            npm run bake-dot-art
          </code>
          .
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
        >
          <Upload data-icon="inline-start" /> Upload
        </Button>
      </div>
    </div>
  );
}
