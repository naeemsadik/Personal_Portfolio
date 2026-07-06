/**
 * Cookie helpers for the admin session.
 *
 * The browser stores the FastAPI JWT in an httpOnly cookie named `nas_token`.
 * Server-side route handlers read it via `cookies()` and forward it as a
 * Bearer token to FastAPI. This file centralizes name + max-age constants
 * so the login/logout/proxy handlers stay in sync.
 */
import 'server-only';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'nas_token';

const FIFTEEN_MIN_SECONDS = 15 * 60;

/** Read the admin session token from the request cookies. */
export function getSessionToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Build a `Set-Cookie` header value. We build the string manually so we can
 * use the same code in `route.ts` handlers (which return Response) and any
 * place that needs to set a cookie without depending on Next's `cookies()`
 * write API (which is not always available, e.g. in route handlers that
 * have already read the cookies in the same request).
 */
export function buildSessionCookie(token: string | null): string {
  const parts = [
    `${SESSION_COOKIE}=${token ?? ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${token ? FIFTEEN_MIN_SECONDS : 0}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}
