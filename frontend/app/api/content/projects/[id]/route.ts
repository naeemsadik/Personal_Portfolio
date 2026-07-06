/**
 * /api/content/projects/[id]
 *
 * DELETE — admin only. Remove a project.
 * PATCH — admin only. Partial update. The list page uses it to flip the
 *         `status` field (publish/unpublish) without re-rendering the editor.
 */
import { NextResponse } from 'next/server';
import { adminProxy, projectToCamel, projectToSnake } from '@/lib/api/proxy';

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
    path: `/content/projects/${encodeURIComponent(params.id)}`,
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
  // Currently only `status` is patchable from the list page. Forwarding
  // through the same `projectToSnake` mapper keeps the contract consistent
  // with the POST handler in case more fields are added later.
  return adminProxy({
    method: 'PATCH',
    path: `/content/projects/${encodeURIComponent(params.id)}`,
    body: projectToSnake(body as unknown as Parameters<typeof projectToSnake>[0]),
    requireAuth: true,
    translate: (raw) =>
      projectToCamel(raw as Parameters<typeof projectToCamel>[0]),
  });
}
