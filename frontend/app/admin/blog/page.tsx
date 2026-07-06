import { listAllPostsAdmin } from '@/lib/content/blog';
import { BlogListAdmin } from '@/components/admin/BlogListAdmin';

/**
 * /admin/blog — list of all blog posts (drafts + published) with edit /
 * publish-toggle / delete actions. The editor itself lives at
 * /admin/blog/new and /admin/blog/[id].
 */
export default async function AdminBlogPage() {
  const posts = await listAllPostsAdmin();
  return <BlogListAdmin initial={posts} />;
}
