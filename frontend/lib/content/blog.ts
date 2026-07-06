/**
 * Blog read layer — used by the public `/blog`, `/blog/[slug]`, and
 * `/blog/tag/[tag]` pages, plus the RSS feed at `/blog/rss.xml`.
 *
 * Reads are cached at the function level via `unstable_cache` so multiple
 * page renders within a request window share the same upstream call. On
 * FastAPI error (offline, transient, malformed) the public pages still
 * render from the static `fallbackBlogPosts` so the site stays usable.
 */
import 'server-only';
import { unstable_cache as cache } from 'next/cache';
import { type BlogPost, blogPostSchema } from '@/lib/content/schema';
import { fallbackBlogPosts } from '@/lib/content/fallback';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import { mapBlogPost, type RawBlogPost } from '@/lib/content/read';

export const revalidate = 60; // seconds

const isBuildPhase = () => process.env.NEXT_PHASE === 'phase-production-build';

export type ListPostsOptions = {
  tag?: string;
  limit?: number;
  offset?: number;
};

/** Public list — published posts only, newest first. */
export async function listPosts(
  opts: ListPostsOptions = {},
): Promise<BlogPost[]> {
  if (isBuildPhase()) return [...fallbackBlogPosts];
  try {
    const data = await apiFetch<RawBlogPost[]>('/blog', {
      query: {
        tag: opts.tag,
        limit: opts.limit ?? 50,
        offset: opts.offset ?? 0,
      },
    });
    if (!data || data.length === 0) return [...fallbackBlogPosts];
    return data.map((raw) => blogPostSchema.parse(mapBlogPost(raw)));
  } catch (err) {
    if (!(err instanceof UpstreamError)) {
      console.warn('listPosts unexpected error:', err);
    }
    return [...fallbackBlogPosts];
  }
}

/** Single post by slug. 404 → null. */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (isBuildPhase())
    return fallbackBlogPosts.find((p) => p.slug === slug) ?? null;
  try {
    const raw = await apiFetch<RawBlogPost>(`/blog/${encodeURIComponent(slug)}`);
    return blogPostSchema.parse(mapBlogPost(raw));
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 404) {
      return null;
    }
    if (!(err instanceof UpstreamError)) {
      console.warn('getPostBySlug unexpected error:', err);
    }
    // Backend offline → fall back to a known post by slug, if any.
    return fallbackBlogPosts.find((p) => p.slug === slug) ?? null;
  }
}

/**
 * Admin-only: list *all* posts (including drafts) via the admin endpoint.
 *
 * Falls back to the public list (published only) if the admin call fails
 * — this lets `/admin/blog` still render something useful when the
 * server-side request doesn't carry the admin cookie (e.g. during
 * prerender of an error state).
 */
export async function listAllPostsAdmin(): Promise<BlogPost[]> {
  if (isBuildPhase()) return [...fallbackBlogPosts];
  const { getSessionToken } = await import('@/lib/api/cookie');
  const token = getSessionToken();
  try {
    const data = await apiFetch<RawBlogPost[]>('/blog/admin/all', { token });
    if (!data || data.length === 0) return listPosts({ limit: 100 });
    return data.map((raw) => blogPostSchema.parse(mapBlogPost(raw)));
  } catch (err) {
    if (!(err instanceof UpstreamError)) {
      console.warn('listAllPostsAdmin unexpected error:', err);
    }
    return listPosts({ limit: 100 });
  }
}

/**
 * Admin-only: fetch a single post by id (including drafts). Returns null if
 * the post doesn't exist or the caller isn't an admin.
 */
export async function getPostAdmin(id: number): Promise<BlogPost | null> {
  if (isBuildPhase()) return null;
  const { getSessionToken } = await import('@/lib/api/cookie');
  const token = getSessionToken();
  try {
    const raw = await apiFetch<RawBlogPost>(`/blog/admin/post/${id}`, { token });
    return blogPostSchema.parse(mapBlogPost(raw));
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 404) return null;
    if (!(err instanceof UpstreamError)) {
      console.warn('getPostAdmin unexpected error:', err);
    }
    return null;
  }
}

// ---------- Cached variants for the public list/detail pages ----------

/** Cached "latest published posts" used by the home + /blog index pages. */
export const getLatestPosts = cache(
  async (limit = 3): Promise<BlogPost[]> => {
    return listPosts({ limit });
  },
  ['blog-latest'],
  { revalidate },
);

/** Cached "all published posts" used by the /blog index. */
export const getAllPublishedPosts = cache(
  async (): Promise<BlogPost[]> => {
    return listPosts({ limit: 100 });
  },
  ['blog-all'],
  { revalidate },
);

/** Cached post by slug, used by /blog/[slug]. */
export const getPublishedPostBySlug = cache(
  async (slug: string): Promise<BlogPost | null> => {
    return getPostBySlug(slug);
  },
  ['blog-slug'],
  { revalidate },
);

/** Cached "posts filtered by tag", used by /blog/tag/[tag]. */
export const getPostsByTag = cache(
  async (tag: string): Promise<BlogPost[]> => {
    return listPosts({ tag, limit: 100 });
  },
  ['blog-tag'],
  { revalidate },
);
