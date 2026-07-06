import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogList } from '@/components/sections/BlogList';
import { getPostsByTag } from '@/lib/content/blog';
import { getSettings } from '@/lib/content/read';

export const revalidate = 60;

type Params = { tag: string };

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const tag = decodeURIComponent(params.tag);
  const settings = await getSettings();
  return {
    title: `${tag} · Blog · ${settings.siteTitle}`,
    description: `Posts tagged "${tag}".`,
  };
}

export default async function BlogTagPage({ params }: { params: Params }) {
  const tag = decodeURIComponent(params.tag);
  const posts = await getPostsByTag(tag);
  return (
    <div className="container flex flex-col gap-10 py-24 md:py-32">
      <header className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
        <Link
          href="/blog"
          className="text-xs uppercase tracking-[0.3em] text-accent/80 transition hover:text-accent"
        >
          &larr; All posts
        </Link>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Tag
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          {tag}
        </h1>
        <p className="text-sm text-muted-foreground">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'} tagged
          <span className="text-foreground"> {tag}</span>.
        </p>
      </header>
      <BlogList posts={posts} emptyText={`No posts tagged "${tag}" yet.`} />
    </div>
  );
}
