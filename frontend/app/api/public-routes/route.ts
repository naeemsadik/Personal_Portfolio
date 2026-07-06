/**
 * /api/public-routes
 *
 * Returns the canonical list of public URLs the snapshot crawler should bake.
 * Browser admin calls authenticate with the session cookie. The FastAPI
 * crawler is server-to-server, so it forwards the admin JWT as a bearer token.
 */
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSessionToken } from '@/lib/api/cookie';
import { getPublicRoutes } from '@/lib/public-routes';

export const runtime = 'nodejs';

function getBearerToken(): string | null {
  const auth = headers().get('authorization');
  if (!auth) return null;

  const [scheme, token] = auth.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export async function GET() {
  if (!getSessionToken() && !getBearerToken()) {
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
