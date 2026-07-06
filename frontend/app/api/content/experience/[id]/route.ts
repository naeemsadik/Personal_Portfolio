/**
 * /api/content/experience/[id]
 *
 * DELETE — admin only. Remove an experience entry.
 * PATCH — admin only. Partial update. The list page uses it to flip the
 *         `status` field (publish/unpublish) without re-rendering the editor.
 */
import { NextResponse } from 'next/server';
import {
  adminProxy,
  experienceToCamel,
  experienceToSnake,
} from '@/lib/api/proxy';

export const runtime = 'nodejs';

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return adminProxy({
    method: 'DELETE',
    path: `/content/experience/${encodeURIComponent(params.id)}`,
    requireAuth: true,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  return adminProxy({
    method: 'PATCH',
    path: `/content/experience/${encodeURIComponent(params.id)}`,
    body: experienceToSnake(
      body as unknown as Parameters<typeof experienceToSnake>[0],
    ),
    requireAuth: true,
    translate: (raw) =>
      experienceToCamel(raw as Parameters<typeof experienceToCamel>[0]),
  });
}
