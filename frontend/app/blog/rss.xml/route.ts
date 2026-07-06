/**
 * GET /blog/rss.xml
 *
 * RSS 2.0 feed of the most recent published posts. Consumed by feed
 * readers (Feedly, NetNewsWire, etc.). We fetch the latest posts from
 * FastAPI via the cached `getAllPublishedPosts()` helper, which falls
 * back to the static `fallbackBlogPosts` when the backend is offline.
 */
import { getAllPublishedPosts } from '@/lib/content/blog';
import { getSettings } from '@/lib/content/read';
import { getSiteUrl } from '@/lib/env';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const revalidate = 60;

export async function GET() {
  const [posts, settings, siteUrl] = await Promise.all([
    getAllPublishedPosts(),
    getSettings(),
    Promise.resolve(getSiteUrl()),
  ]);

  const items = posts
    .filter((p) => p.status === 'published')
    .slice(0, 50)
    .map((p) => {
      const link = `${siteUrl}/blog/${p.slug}`;
      const pubDate = p.publishedAt
        ? new Date(p.publishedAt).toUTCString()
        : new Date(p.updatedAt).toUTCString();
      return `  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${link}</link>
    <guid>${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${escapeXml(p.excerpt)}</description>${
      p.tags.length
        ? p.tags.map((t) => `\n    <category>${escapeXml(t)}</category>`).join('')
        : ''
    }
  </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(settings.siteTitle)}</title>
    <link>${siteUrl}/blog</link>
    <description>${escapeXml(settings.description ?? '')}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300',
    },
  });
}
