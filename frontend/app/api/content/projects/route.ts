/**
 * /api/content/projects
 *
 * GET — list all (camelCase)
 * POST — upsert one (admin only; camelCase body in, snake_case to FastAPI)
 * DELETE — id in JSON body
 */
import { NextResponse } from 'next/server';
import { adminProxy, projectToCamel, projectToSnake } from '@/lib/api/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return adminProxy({
    method: 'GET',
    path: '/content/projects',
    translate: (raw) => {
      if (!Array.isArray(raw)) return raw;
      return raw.map((r) => projectToCamel(r as Parameters<typeof projectToCamel>[0]));
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
    path: '/content/projects',
    body,
    requireAuth: true,
    translate: (raw) =>
      projectToCamel(raw as Parameters<typeof projectToCamel>[0]),
    translateRequest: (body) =>
      projectToSnake(body as Parameters<typeof projectToSnake>[0]),
  });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  return adminProxy({
    method: 'DELETE',
    path: `/content/projects/${encodeURIComponent(body.id)}`,
    requireAuth: true,
  });
}
