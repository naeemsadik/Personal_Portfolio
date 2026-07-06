/**
 * /api/content/experience
 *
 * GET — list all (camelCase)
 * POST — upsert one (admin only; camelCase body in, snake_case to FastAPI)
 * DELETE — id in JSON body
 */
import { NextResponse } from 'next/server';
import { adminProxy, experienceToCamel, experienceToSnake } from '@/lib/api/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return adminProxy({
    method: 'GET',
    path: '/content/experience',
    translate: (raw) => {
      if (!Array.isArray(raw)) return raw;
      return raw.map((r) => experienceToCamel(r as Parameters<typeof experienceToCamel>[0]));
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  return adminProxy({
    method: 'POST',
    path: '/content/experience',
    body,
    requireAuth: true,
    translate: (raw) =>
      experienceToCamel(raw as Parameters<typeof experienceToCamel>[0]),
    translateRequest: (body) =>
      experienceToSnake(body as Parameters<typeof experienceToSnake>[0]),
  });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  return adminProxy({
    method: 'DELETE',
    path: `/content/experience/${encodeURIComponent(body.id)}`,
    requireAuth: true,
  });
}
