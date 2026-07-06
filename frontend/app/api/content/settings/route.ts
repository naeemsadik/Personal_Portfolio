/**
 * /api/content/settings — see comment in /api/content/hero/route.ts.
 */
import { NextResponse } from 'next/server';
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return adminProxy({ method: 'GET', path: '/content/settings' });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  return adminProxy({
    method: 'PUT',
    path: '/content/settings',
    body: { data: body },
    requireAuth: true,
  });
}
