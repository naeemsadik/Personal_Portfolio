import { notFound } from 'next/navigation';
import { getPostAdmin } from '@/lib/content/blog';
import { BlogEditor } from '@/components/admin/BlogEditor';

export default async function EditBlogPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) notFound();
  const post = await getPostAdmin(id);
  if (!post) notFound();
  return <BlogEditor mode="edit" initial={post} />;
}
