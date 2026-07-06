/**
 * Snapshot middleware.
 *
 * Rewrites public requests to a static snapshot directory when snapshot
 * mode is enabled. Two modes:
 *
 *  1. Preview: `?snapshot=vN` query param. Lets the admin browse a
 *     specific snapshot without affecting the live site.
 *
 *  2. Published: when `site_settings.snapshot_mode='published'` and a
 *     `published_snapshot_version` is set, every public request rewrites
 *     to that version's HTML.
 *
 * Kill switches:
 *
 *  - `process.env.EMERGENCY_DISABLE_SNAPSHOT_MODE === '1'` short-circuits
 *    the entire middleware. Non-negotiable. Use this when something is
 *    broken and you need live SSR back immediately.
 *
 *  - The `/api/site-state` fetch is fail-open. If the backend is down
 *    or slow, middleware returns `NextResponse.next()` (live SSR).
 *    A broken FastAPI never takes the public site down.
 *
 * The matcher excludes admin, api, _next, and __snapshots__ so the
 * middleware never rewrites itself or applies to backend-proxy paths.
 */
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: [
    // Public paths only. Admin, API, _next, and __snapshots__ are
    // excluded so we never rewrite to ourselves or block admin work.
    '/((?!admin|api|_next|__snapshots__|favicon\\.ico|.*\\..*).*)',
  ],
};

// Snapshot version slug pattern. Must match what the backend generates
// (vYYYY-MM-DD-HHMMSS) and what admins may type manually.
const VERSION_RE = /^v[A-Za-z0-9._-]+$/;

type SiteState = {
  snapshotMode: 'off' | 'published';
  publishedVersion: string | null;
};

/** Build the rewrite target for a given (version, pathname). */
function snapshotPath(version: string, pathname: string): string {
  // Empty pathname (root) → /__snapshots__/<v>/index.html
  // Non-empty         → /__snapshots__/<v><pathname>/index.html
  const trimmed = pathname === '/' ? '' : pathname.replace(/\/$/, '');
  return `/__snapshots__/${version}${trimmed}/index.html`;
}

/** Fetch the current site-state. Returns null on any error (fail-open). */
async function fetchSiteState(req: NextRequest): Promise<SiteState | null> {
  try {
    const url = new URL('/api/site-state', req.url);
    const res = await fetch(url, {
      // Next's data cache re-validates every 10s. Combine with the
      // route handler's own Cache-Control header for layered caching.
      next: { revalidate: 10 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<SiteState>;
    if (data.snapshotMode !== 'published') return null;
    if (!data.publishedVersion || typeof data.publishedVersion !== 'string') {
      return null;
    }
    return {
      snapshotMode: 'published',
      publishedVersion: data.publishedVersion,
    };
  } catch {
    // Network error, abort, JSON parse error — fail open.
    return null;
  }
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  // 1. Kill switch — env var trumps everything. Documented in the plan.
  if (process.env.EMERGENCY_DISABLE_SNAPSHOT_MODE === '1') {
    return NextResponse.next();
  }

  const url = req.nextUrl;
  const pathname = url.pathname;

  // 2. Preview mode — `?snapshot=vN`. Lets the admin browse a specific
  //    snapshot without affecting the live site. Set a non-httpOnly
  //    cookie so the SnapshotPreviewBanner can read it on the client.
  const previewParam = url.searchParams.get('snapshot');
  if (previewParam && VERSION_RE.test(previewParam)) {
    const target = snapshotPath(previewParam, pathname);
    const res = NextResponse.rewrite(new URL(target, req.url));
    res.headers.set('X-Snapshot-Preview', previewParam);
    res.cookies.set('nas_snapshot_preview', previewParam, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour — preview is ephemeral
    });
    return res;
  }

  // 3. Published mode — the live pointer in DB points to a version.
  //    All public requests rewrite to that version's HTML.
  const state = await fetchSiteState(req);
  if (state?.snapshotMode === 'published' && state.publishedVersion) {
    if (!VERSION_RE.test(state.publishedVersion)) {
      // Corrupt DB state — fail open rather than serve a 404 storm.
      return NextResponse.next();
    }
    const target = snapshotPath(state.publishedVersion, pathname);
    const res = NextResponse.rewrite(new URL(target, req.url));
    res.headers.set('X-Snapshot-Live', state.publishedVersion);
    return res;
  }

  // 4. Default — live SSR.
  return NextResponse.next();
}