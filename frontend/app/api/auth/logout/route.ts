/**
 * POST /api/auth/logout
 *
 * Clears the httpOnly session cookie. The FastAPI token is stateless JWT
 * and expires on its own; clearing the cookie is enough to end the
 * browser session.
 */
import { NextResponse } from 'next/server';
import { buildSessionCookie } from '@/lib/api/cookie';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', buildSessionCookie(null));
  return res;
}
