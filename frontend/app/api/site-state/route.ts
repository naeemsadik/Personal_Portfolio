/**
 * /api/site-state
 *
 * Public proxy to FastAPI `GET /site-state`. Cached at the edge for
 * 10s — the snapshot middleware fetches this on every public request,
 * so we want both a short TTL (so publish propagates quickly) and a
 * header that lets a CDN upstream cache it too.
 *
 * No auth — this is the public snapshot pointer.
 */
import { NextResponse } from 'next/server';
import { apiFetch, UpstreamError } from '@/lib/api/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SiteState = {
  snapshotMode: 'off' | 'published';
  publishedVersion: string | null;
};

export async function GET(): Promise<NextResponse> {
  try {
    const data = await apiFetch<SiteState>('/site-state', {
      // apiFetch defaults to `cache: 'no-store'` already; we still
      // set a short timeout so a slow backend doesn't pin the route.
      timeoutMs: 2000,
    });
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=10',
      },
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      // Fail open — middleware needs to be able to read a default state
      // even if the backend is briefly unavailable.
      return NextResponse.json(
        { snapshotMode: 'off', publishedVersion: null },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=5, s-maxage=5',
          },
        },
      );
    }
    return NextResponse.json(
      { snapshotMode: 'off', publishedVersion: null },
      { status: 200 },
    );
  }
}