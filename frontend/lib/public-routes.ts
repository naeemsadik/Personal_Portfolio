/**
 * Canonical list of public routes the snapshot crawler should bake.
 *
 * This is the single source of truth shared by:
 *   - `app/sitemap.ts` (Next.js sitemap)
 *   - the FastAPI snapshot crawler (via `GET /api/public-routes`)
 *
 * The crawler fetches each route as HTML, so we return paths without
 * site URL prefix and without anchor fragments (`/projects#<id>` is
 * not a separate page — the crawler fetches `/projects` once and the
 * in-page anchors are part of that response).
 */
import 'server-only';
import { listProjects } from '@/lib/content/read';
import { getAllPublishedPosts } from '@/lib/content/blog';

export type PublicRoute = {
  /** Path starting with `/`. Always non-empty. */
  path: string;
  /** ISO 8601 string if known (helps the crawler set If-Modified-Since). */
  lastModified?: string;
};

const STATIC_ROUTES: PublicRoute[] = [
  { path: '/' },
  { path: '/experience' },
  { path: '/projects' },
  { path: '/blog' },
  { path: '/contact' },
];

export async function getPublicRoutes(): Promise<PublicRoute[]> {
  // Fetch DB-driven routes in parallel. Fall back to the static list
  // only — never throw — so a transient DB error doesn't break the
  // sitemap or the crawler.
  const [projects, posts] = await Promise.all([
    listProjects().catch(() => []),
    getAllPublishedPosts().catch(() => []),
  ]);

  return [
    ...STATIC_ROUTES,
    ...posts.map((p) => ({
      path: `/blog/${p.slug}`,
      lastModified: p.updatedAt ?? undefined,
    })),
    // Note: we deliberately omit /projects#<id> anchor entries from the
    // sitemap too. They're in-page fragments, not separate pages.
    // (The previous sitemap.ts listed them; this consolidates.)
  ];
}