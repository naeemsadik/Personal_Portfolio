/**
 * /api/content/hero
 *
 * Hero is a full dict stored in a JSON column — keys are whatever the
 * admin client sends. No snake↔camel translation needed.
 */
import { NextResponse } from 'next/server';
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return adminProxy({ method: 'GET', path: '/content/hero' });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  return adminProxy({
    method: 'PUT',
    path: '/content/hero',
    body: { data: body },
    requireAuth: true,
  });
}
