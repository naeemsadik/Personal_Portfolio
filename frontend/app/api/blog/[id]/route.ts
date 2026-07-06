/**
 * /api/blog/[id]
 *
 * DELETE — admin only. Remove a post.
 * PATCH — admin only. Partial update. The list page uses it to flip the
 *         `status` field (publish/unpublish) without re-rendering the editor.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/api/cookie';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import { mapBlogPost } from '@/lib/content/read';

export const runtime = 'nodejs';

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const token = getSessionToken();
  if (!token) return unauthorized();
  try {
    await apiFetch(`/blog/${encodeURIComponent(params.id)}`, {
      method: 'DELETE',
      token,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UpstreamError) {
      const status = err.status === 0 ? 502 : err.status;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'delete failed' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const token = getSessionToken();
  if (!token) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only forward known fields so a typo can't accidentally nuke content.
  const allowed: Array<keyof typeof body> = [
    'slug',
    'title',
    'excerpt',
    'body',
    'cover_url',
    'tags',
    'status',
    'ord',
  ];
  const forward: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) forward[k] = body[k];
  }

  try {
    const raw = await apiFetch<Parameters<typeof mapBlogPost>[0]>(
      `/blog/${encodeURIComponent(params.id)}`,
      { method: 'PATCH', token, body: forward },
    );
    return NextResponse.json(mapBlogPost(raw));
  } catch (err) {
    if (err instanceof UpstreamError) {
      const status = err.status === 0 ? 502 : err.status;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'patch failed' },
      { status: 500 },
    );
  }
}
