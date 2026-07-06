/**
 * /api/public-routes
 *
 * Returns the canonical list of public URLs the snapshot crawler
 * should bake. Source of truth: `lib/public-routes.ts` (shared with
 * `app/sitemap.ts`).
 *
 * The route is admin-gated because it returns the same data the
 * admin sees in the sitemap/source-of-truth, and the FastAPI snapshot
 * crawler authenticates with the admin's forwarded JWT.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/api/cookie';
import { getPublicRoutes } from '@/lib/public-routes';

export const runtime = 'nodejs';

export async function GET() {
  // The crawler forwards the admin's JWT — for the data to be
  // trustworthy, we require the caller to be admin too. (The
  // sitemap itself is public; this endpoint isn't.)
  if (!getSessionToken()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const routes = await getPublicRoutes();
  return NextResponse.json(
    { routes },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}