/**
 * GET /api/auth/me
 *
 * Returns the current admin profile (`{email, role}`) or 401 if the
 * session cookie is missing/invalid. Used by the admin client to check
 * whether to show the login page or the dashboard.
 */
import { NextResponse } from 'next/server';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import { getSessionToken } from '@/lib/api/cookie';

export const runtime = 'nodejs';

type MeOut = { id: number; email: string; role: string };

export async function GET() {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const me = await apiFetch<MeOut>('/auth/me', { token });
    return NextResponse.json({ email: me.email, role: me.role });
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 401) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 500 },
    );
  }
}
