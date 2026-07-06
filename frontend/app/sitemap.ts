import type { MetadataRoute } from 'next';
import { getPublicRoutes } from '@/lib/public-routes';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  'https://naeemsadik.dev';

// Keep sitemap priorities and change-frequencies identical to the
// previous hand-written version. The route source moved to
// `lib/public-routes.ts` so it's shared with the snapshot crawler.
const STATIC_META: Record<
  string,
  { changeFrequency: 'monthly' | 'weekly' | 'yearly'; priority: number }
> = {
  '/': { changeFrequency: 'monthly', priority: 1 },
  '/experience': { changeFrequency: 'monthly', priority: 0.8 },
  '/projects': { changeFrequency: 'monthly', priority: 0.9 },
  '/blog': { changeFrequency: 'weekly', priority: 0.8 },
  '/contact': { changeFrequency: 'yearly', priority: 0.5 },
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getPublicRoutes();
  const now = new Date();
  return routes.map((r) => {
    const meta = STATIC_META[r.path] ?? {
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    };
    return {
      url: `${SITE_URL}${r.path}`,
      lastModified: r.lastModified ? new Date(r.lastModified) : now,
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    };
  });
}