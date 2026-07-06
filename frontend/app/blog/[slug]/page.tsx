import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostView } from '@/components/sections/BlogPostView';
import { getPublishedPostBySlug } from '@/lib/content/blog';
import { getSettings } from '@/lib/content/read';

export const revalidate = 60;

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const post = await getPublishedPostBySlug(params.slug);
  if (!post) return { title: 'Post not found' };
  const settings = await getSettings();
  return {
    title: `${post.title} · ${settings.siteTitle}`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.coverUrl ? [post.coverUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const post = await getPublishedPostBySlug(params.slug);
  if (!post) notFound();
  return (
    <div className="container py-24 md:py-32">
      <BlogPostView post={post} />
    </div>
  );
}
