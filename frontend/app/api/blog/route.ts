/**
 * /api/blog
 *
 * Admin-only. Used by `BlogEditor` to create/update posts. We translate
 * the camelCase editor payload into the snake_case FastAPI schema and
 * translate the snake_case response back into camelCase for the editor
 * state.
 *
 * The public blog pages read directly via `lib/content/blog.ts` (server
 * components) and don't go through this proxy.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/api/cookie';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import { mapBlogPost } from '@/lib/content/read';

export const runtime = 'nodejs';

type CamelPost = {
  id?: number | null;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverUrl?: string | null;
  tags?: string[];
  status: 'draft' | 'published';
  order?: number;
};

function postToSnake(body: CamelPost) {
  return {
    id: body.id ?? null,
    slug: body.slug,
    title: body.title,
    excerpt: body.excerpt,
    body: body.body,
    cover_url: body.coverUrl ?? null,
    tags: body.tags ?? [],
    status: body.status,
    ord: body.order ?? 0,
  };
}

export async function POST(req: Request) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: CamelPost;
  try {
    body = (await req.json()) as CamelPost;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const raw = await apiFetch<Parameters<typeof mapBlogPost>[0]>('/blog', {
      method: 'POST',
      token,
      body: postToSnake(body),
    });
    return NextResponse.json(mapBlogPost(raw));
  } catch (err) {
    if (err instanceof UpstreamError) {
      const status = err.status === 0 ? 502 : err.status;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'save failed' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/blog?tag=... — admin list-all, including drafts.
 *
 * Used by the admin Blog page to fetch the full list. Returns camelCase
 * so the admin table can render directly.
 */
export async function GET() {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const raw = await apiFetch<Parameters<typeof mapBlogPost>[0][]>('/blog/admin/all', {
      token,
    });
    return NextResponse.json(raw.map((r) => mapBlogPost(r)));
  } catch (err) {
    if (err instanceof UpstreamError) {
      const status = err.status === 0 ? 502 : err.status;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'list failed' },
      { status: 500 },
    );
  }
}