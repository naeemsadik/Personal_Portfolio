/**
 * POST /api/auth/login
 *
 * Forwards `{email, password}` to FastAPI `/auth/login`. On success, sets
 * the JWT in an httpOnly cookie `nas_token` and returns a small profile
 * payload that the client uses to gate the admin UI.
 *
 * FastAPI stays the source of truth for credentials and token issuance —
 * Next.js only persists the bearer token in a cookie.
 */
import { NextResponse } from 'next/server';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import { buildSessionCookie } from '@/lib/api/cookie';

export const runtime = 'nodejs';

type LoginOut = {
  access_token: string;
  expires_at: string;
  role: string;
  email: string;
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const result = await apiFetch<LoginOut>('/auth/login', { body });
    const res = NextResponse.json({
      ok: true,
      role: result.role,
      email: result.email,
    });
    res.headers.set('Set-Cookie', buildSessionCookie(result.access_token));
    return res;
  } catch (err) {
    if (err instanceof UpstreamError && (err.status === 401 || err.status === 0)) {
      return NextResponse.json({ error: 'invalid email or password' }, { status: 401 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'login failed' },
      { status: 500 },
    );
  }
}
