'use client';

import { useEffect, useRef } from 'react';

type Props = {
  /**
   * Path to a JSON file containing pre-baked per-dot positions (in 0..1
   * normalised space). The client component fetches this on mount and uses
   * it to draw the dots on a `<canvas>`. There is no image fallback — the
   * text file in the admin panel is the only source of truth for the
   * portrait, and the JSON is the runtime artifact.
   */
  positionsSrc?: string;
  /** Alt text for accessibility. */
  alt?: string;
  className?: string;
};

const DEFAULT_POSITIONS = '/portrait/PictureonNAS.particles.json';

// Repel tuning (after dots have settled)
const RADIUS_FRAC = 0.24;
const PUSH_STRENGTH = 26;
const RETURN_EASING = 0.16;
const FOLLOW_EASING = 0.18;
const VELOCITY_DAMPING = 0.78;
const DPR_CAP = 2;

// Intro animation tuning — dots start scattered across the viewport and
// fly toward their home positions over ~1.5s with a small stagger.
const INTRO_DURATION_MS = 1600;
const INTRO_STAGGER_MAX_MS = 600;
const INTRO_SCATTER_PADDING = 80; // px outside the viewport

/**
 * Brand-mark portrait.
 *
 * Renders the dot-art portrait as a 2D canvas drawing. The dot positions
 * come from a JSON file produced server-side by `scripts/bake-dot-art.mjs`
 * (or by the admin upload endpoint) from a hand-typed braille text file.
 *
 * No image is ever shown — the canvas IS the portrait, with transparent
 * background so it sits on the page's dark navy.
 *
 * Animation flow:
 *   1. On mount, each dot is placed at a random scattered position
 *      somewhere across the viewport (off-screen to either side).
 *   2. Over `INTRO_DURATION_MS` the dots fly toward their home positions
 *      inside the portrait. Dots further from their target take a bit
 *      longer, so the cluster "assembles" rather than all snapping at once.
 *   3. Once every dot has reached home, the existing hover-repel takes
 *      over: dots within `RADIUS_FRAC` of canvas size are pushed away from
 *      the pointer; when the pointer leaves, they ease back home.
 *
 * Respects `prefers-reduced-motion` (no intro animation, just the static
 * dot grid).
 */
export function PortraitFrame({
  positionsSrc = DEFAULT_POSITIONS,
  alt: _alt = 'Portrait',
  className,
}: Props) {
  return (
    <div
      className={'relative aspect-square w-full ' + (className ?? '')}
      role="img"
      aria-label={_alt}
    >
      <PortraitCanvas positionsSrc={positionsSrc} />
    </div>
  );
}

type Dot = {
  ox: number;
  oy: number;
  // Current rendered position.
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Normalised home (0..1 in 200x200 space).
  nx: number;
  ny: number;
  // Intro state.
  startX: number;
  startY: number;
  startAt: number;
  duration: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/**
 * Interactive canvas layer. Mounts on the client, fetches the per-dot JSON,
 * and runs a small rAF loop that (a) flies dots from scattered positions
 * to their homes on mount, then (b) pushes dots away from the mouse pointer
 * and lets them return when the mouse leaves.
 */
function PortraitCanvas({ positionsSrc }: { positionsSrc: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isReduced = reduceMq.matches;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let raf = 0;
    let dots: Dot[] = [];
    let dotRadius = 0;
    let color = 'rgba(124, 245, 179, 0.95)';

    let mouseX = -9999;
    let mouseY = -9999;
    let mouseStrength = 0;

    let cssSize = 0;
    let viewW = 0;
    let viewH = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

    // Animation start time (used for the intro fly-in).
    let introStartedAt = 0;
    let introDone = false;

    function measure() {
      const rect = container!.getBoundingClientRect();
      const next = Math.max(1, Math.floor(rect.width));
      if (next !== cssSize) {
        cssSize = next;
        canvas!.style.width = cssSize + 'px';
        canvas!.style.height = cssSize + 'px';
        canvas!.width = Math.floor(cssSize * dpr);
        canvas!.height = Math.floor(cssSize * dpr);
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cell = cssSize / 200;
        dotRadius = Math.max(1.0, cell * 0.42);
        if (dots.length) anchorDots();
      }
      viewW = window.innerWidth;
      viewH = window.innerHeight;
    }

    function anchorDots() {
      const cell = cssSize / 200;
      const offsetX = (cssSize - 200 * cell) / 2;
      const offsetY = (cssSize - 200 * cell) / 2;
      for (const d of dots) {
        d.ox = offsetX + d.nx * 200 * cell;
        d.oy = offsetY + d.ny * 200 * cell;
        // Keep the *current* position in sync with the new home; if an
        // intro is running it will resume from the in-flight interpolated
        // position on the next frame.
        if (introDone) {
          d.x = d.ox;
          d.y = d.oy;
        }
        d.vx = 0;
        d.vy = 0;
      }
    }

    function onPointerMove(e: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      mouseStrength = 1;
    }
    function onPointerLeave() {
      mouseStrength = 0;
    }

    /**
     * Cubic ease-out — fast at the start, gentle at the end. Matches the
     * `[0.22, 1, 0.36, 1]` curve used elsewhere in the hero.
     */
    function easeOutCubic(t: number) {
      const v = 1 - t;
      return 1 - v * v * v;
    }

    function pickScatterPosition(targetX: number, targetY: number) {
      // Bias scatter to the *opposite* side of the viewport from the
      // target so dots feel like they're flying *inward* rather than
      // wobbling in place. Mostly off-screen to either side, occasionally
      // above or below, with some random scatter anywhere as variety.
      const r = Math.random();
      const pad = INTRO_SCATTER_PADDING;
      if (r < 0.45) {
        // Off one of the horizontal edges.
        const left = targetX < viewW / 2;
        const x = left ? rand(-pad, 0) : rand(viewW, viewW + pad);
        const y = rand(-pad, viewH + pad);
        return { x, y };
      } else if (r < 0.7) {
        // Off the top or bottom.
        const top = targetY < viewH / 2;
        const x = rand(-pad, viewW + pad);
        const y = top ? rand(-pad, 0) : rand(viewH, viewH + pad);
        return { x, y };
      } else {
        // Random scatter anywhere off-screen.
        return {
          x: Math.random() < 0.5 ? rand(-pad, 0) : rand(viewW, viewW + pad),
          y: rand(-pad, viewH + pad),
        };
      }
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      if (cancelled) return;

      measure();
      if (cssSize < 2) return;

      // Transparent clear — no background fill, the page navy shows through.
      ctx!.clearRect(0, 0, cssSize, cssSize);

      const radiusPx = cssSize * RADIUS_FRAC;
      const radiusSq = radiusPx * radiusPx;
      const now = performance.now();

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]!;
        const ox = d.ox;
        const oy = d.oy;
        let dx = 0;
        let dy = 0;

        // Intro phase: interpolate from the dot's scattered start position
        // to its home over its individual duration. The hover-repel does
        // not run during the intro — the dot's own motion is the story.
        if (!introDone) {
          const t = Math.max(
            0,
            Math.min(1, (now - d.startAt) / d.duration),
          );
          const e = easeOutCubic(t);
          d.x = d.startX + (ox - d.startX) * e;
          d.y = d.startY + (oy - d.startY) * e;
          if (t >= 1) {
            d.x = ox;
            d.y = oy;
            d.vx = 0;
            d.vy = 0;
          }
        } else {
          // Hover-repel phase.
          if (mouseStrength > 0) {
            const px = ox - mouseX;
            const py = oy - mouseY;
            const distSq = px * px + py * py;
            if (distSq < radiusSq && distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const t = 1 - dist / radiusPx;
              const f = t * t;
              const force = f * PUSH_STRENGTH * mouseStrength;
              dx = (px / dist) * force;
              dy = (py / dist) * force;
            }
          }
          const targetX = ox + dx;
          const targetY = oy + dy;
          d.vx += (targetX - (d.x + d.vx)) * FOLLOW_EASING;
          d.vy += (targetY - (d.y + d.vy)) * FOLLOW_EASING;
          d.vx *= VELOCITY_DAMPING;
          d.vy *= VELOCITY_DAMPING;
          d.x += d.vx;
          d.y += d.vy;
          if (mouseStrength < 0.001) {
            d.x += (d.ox - d.x) * RETURN_EASING;
            d.y += (d.oy - d.y) * RETURN_EASING;
          }
        }

        ctx!.beginPath();
        ctx!.arc(d.x, d.y, dotRadius, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.fill();
      }

      // Promote the cluster to "settled" once every dot has reached home.
      if (!introDone && now - introStartedAt > INTRO_DURATION_MS + INTRO_STAGGER_MAX_MS + 100) {
        introDone = true;
      }
    }

    function drawStatic() {
      // Reduced motion: a single static pass, then stop.
      measure();
      if (cssSize < 2) return;
      ctx!.clearRect(0, 0, cssSize, cssSize);
      for (const d of dots) {
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, dotRadius, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.fill();
      }
    }

    async function init() {
      try {
        await new Promise(requestAnimationFrame);
        if (cancelled) return;
        measure();
        if (cssSize < 2) {
          await new Promise((r) => setTimeout(r, 50));
          measure();
        }
        if (cssSize < 2) {
          // Layout never settled — bail.
          return;
        }

        const res = await fetch(positionsSrc, { cache: 'no-store' });
        if (!res.ok) throw new Error('positions fetch failed');
        const data = (await res.json()) as {
          width: number;
          height: number;
          color: string;
          dotRadius: number;
          positions: [number, number][];
        };
        if (cancelled) return;
        color = data.color ?? color;

        const cell = cssSize / 200;
        const offsetX = (cssSize - 200 * cell) / 2;
        const offsetY = (cssSize - 200 * cell) / 2;

        // Place each dot at its final home first, then immediately override
        // the rendered position with a scattered start. The home is kept
        // on `ox`/`oy` so the hover-repel and resize-reanchor code work
        // unchanged.
        dots = data.positions.map(([nx, ny]) => {
          const ox = offsetX + nx * 200 * cell;
          const oy = offsetY + ny * 200 * cell;
          const scatter = pickScatterPosition(ox, oy);
          // Stagger longer flights slightly so the cluster assembles
          // rather than all snapping home in lockstep.
          const dx = ox - scatter.x;
          const dy = oy - scatter.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const extra = Math.min(
            INTRO_STAGGER_MAX_MS,
            Math.max(0, (dist / Math.max(1, viewW)) * INTRO_STAGGER_MAX_MS),
          );
          return {
            nx,
            ny,
            ox,
            oy,
            x: scatter.x,
            y: scatter.y,
            vx: 0,
            vy: 0,
            startX: scatter.x,
            startY: scatter.y,
            startAt: 0, // set right before the rAF loop starts
            duration: INTRO_DURATION_MS + extra,
          };
        });

        canvas!.style.opacity = '1';
        if (isReduced) {
          introDone = true;
          // Skip the intro: snap each dot to its home before drawing.
          for (const d of dots) {
            d.x = d.ox;
            d.y = d.oy;
          }
          drawStatic();
        } else {
          introStartedAt = performance.now();
          for (const d of dots) {
            d.startAt = introStartedAt;
          }
          raf = requestAnimationFrame(tick);
        }
      } catch (err) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn('PortraitCanvas: positions JSON unreachable', err);
        }
      }
    }

    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 200ms ease-out';

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('pointercancel', onPointerLeave);

    void init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointercancel', onPointerLeave);
    };
  }, [positionsSrc]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 size-full"
      />
    </div>
  );
}
