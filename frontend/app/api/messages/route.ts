/**
 * /api/messages
 *
 * GET — list all (admin only, camelCase)
 * PATCH — toggle read (admin only)
 * DELETE — id in JSON body (admin only)
 */
import { NextResponse } from 'next/server';
import { adminProxy, messageToCamel } from '@/lib/api/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return adminProxy({
    method: 'GET',
    path: '/messages',
    requireAuth: true,
    translate: (raw) => {
      if (!Array.isArray(raw)) return raw;
      return raw.map((r) => messageToCamel(r as Parameters<typeof messageToCamel>[0]));
    },
  });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { id?: string | number; read?: boolean }
    | null;
  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  return adminProxy({
    method: 'PATCH',
    path: `/messages/${encodeURIComponent(String(body.id))}`,
    body: { read: Boolean(body.read) },
    requireAuth: true,
    translate: (raw) =>
      messageToCamel(raw as Parameters<typeof messageToCamel>[0]),
  });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string | number } | null;
  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  return adminProxy({
    method: 'DELETE',
    path: `/messages/${encodeURIComponent(String(body.id))}`,
    requireAuth: true,
  });
}
