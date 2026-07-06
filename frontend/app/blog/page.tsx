import type { Metadata } from 'next';
import { BlogList } from '@/components/sections/BlogList';
import { getAllPublishedPosts } from '@/lib/content/blog';
import { getSettings } from '@/lib/content/read';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `Blog · ${settings.siteTitle}`,
    description:
      settings.description ??
      'Articles, post-mortems, and notes from Naeem Abdullah Sadik.',
  };
}

export default async function BlogIndexPage() {
  const posts = await getAllPublishedPosts();
  return (
    <div className="container flex flex-col gap-10 py-24 md:py-32">
      <header className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-accent/80">Blog</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Notes from the build.
        </h1>
        <p className="text-muted-foreground">
          Production systems, hackathon post-mortems, and what I&apos;m learning
          as I ship.
        </p>
      </header>
      <BlogList posts={posts} emptyText="No posts published yet — check back soon." />
    </div>
  );
}
