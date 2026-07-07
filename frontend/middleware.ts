/**
 * Snapshot middleware.
 *
 * Public pages normally render live SSR. Automatic published-snapshot rewrites
 * are opt-in with ENABLE_SNAPSHOT_MIDDLEWARE=1 because hosted frontend
 * deployments, such as Vercel, do not automatically contain snapshot files
 * generated on the VPS. Explicit preview links with ?snapshot=v... still work.
 *
 * EMERGENCY_DISABLE_SNAPSHOT_MODE=1 still short-circuits everything.
 */
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: [
    // Public paths only. Admin, API, _next, and __snapshots__ are excluded.
    '/((?!admin|api|_next|__snapshots__|favicon\\.ico|.*\\..*).*)',
  ],
};

const VERSION_RE = /^v[A-Za-z0-9._-]+$/;

type SiteState = {
  snapshotMode: 'off' | 'published';
  publishedVersion: string | null;
};

function snapshotMiddlewareEnabled(): boolean {
  return process.env.ENABLE_SNAPSHOT_MIDDLEWARE === '1';
}

function snapshotPath(version: string, pathname: string): string {
  const trimmed = pathname === '/' ? '' : pathname.replace(/\/$/, '');
  return `/__snapshots__/${version}${trimmed}/index.html`;
}

function snapshotAssetBaseUrl(): string | null {
  return (
    process.env.SNAPSHOT_ASSET_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    null
  );
}

async function serveSnapshotPage(
  req: NextRequest,
  version: string,
  pathname: string,
  headerName: 'X-Snapshot-Preview' | 'X-Snapshot-Live',
): Promise<NextResponse> {
  const assetBaseUrl = snapshotAssetBaseUrl();
  if (!assetBaseUrl) {
    const res = NextResponse.rewrite(
      new URL(snapshotPath(version, pathname), req.url),
    );
    res.headers.set(headerName, version);
    return res;
  }

  const target = `${assetBaseUrl.replace(/\/+$/, '')}${snapshotPath(
    version,
    pathname,
  )}`;
  const upstream = await fetch(target, {
    headers: { Accept: 'text/html' },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return NextResponse.next();
  }

  const html = await upstream.text();
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      [headerName]: version,
    },
  });
}

async function fetchSiteState(req: NextRequest): Promise<SiteState | null> {
  try {
    const res = await fetch(new URL('/api/site-state', req.url), {
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
    return null;
  }
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  try {
    if (process.env.EMERGENCY_DISABLE_SNAPSHOT_MODE === '1') {
      return NextResponse.next();
    }

    const { pathname, searchParams } = req.nextUrl;
    const previewParam = searchParams.get('snapshot');

    if (previewParam && VERSION_RE.test(previewParam)) {
      const res = await serveSnapshotPage(
        req,
        previewParam,
        pathname,
        'X-Snapshot-Preview',
      );
      res.cookies.set('nas_snapshot_preview', previewParam, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
      });
      return res;
    }

    if (!snapshotMiddlewareEnabled()) {
      return NextResponse.next();
    }

    const state = await fetchSiteState(req);
    if (state?.snapshotMode === 'published' && state.publishedVersion) {
      if (!VERSION_RE.test(state.publishedVersion)) {
        return NextResponse.next();
      }
      return serveSnapshotPage(
        req,
        state.publishedVersion,
        pathname,
        'X-Snapshot-Live',
      );
    }

    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}
