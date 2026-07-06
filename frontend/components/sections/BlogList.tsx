import { BlogCard } from '@/components/blog/BlogCard';
import type { BlogPost } from '@/lib/content/schema';

type Props = {
  posts: BlogPost[];
  emptyText?: string;
};

export function BlogList({ posts, emptyText }: Props) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
        {emptyText ?? 'No posts yet — check back soon.'}
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <BlogCard key={p.id} post={p} />
      ))}
    </div>
  );
}
