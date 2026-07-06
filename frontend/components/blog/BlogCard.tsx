import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { TagPill } from '@/components/blog/TagPill';
import { ReadingTime } from '@/components/blog/ReadingTime';
import { formatDate } from '@/lib/cn';
import type { BlogPost } from '@/lib/content/schema';

type Props = {
  post: BlogPost;
};

export function BlogCard({ post }: Props) {
  return (
    <Card className="group h-full overflow-hidden border-border/60 bg-card/40 transition hover:border-accent/40 hover:bg-card/60">
      {post.coverUrl ? (
        <Link href={`/blog/${post.slug}`} className="block">
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={post.coverUrl}
              alt={post.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
        </Link>
      ) : null}
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          {post.publishedAt ? <span>{formatDate(post.publishedAt)}</span> : null}
          {post.publishedAt ? <span aria-hidden>·</span> : null}
          <ReadingTime minutes={post.readingTimeMin} />
        </div>
        <Link
          href={`/blog/${post.slug}`}
          className="font-display text-xl font-semibold tracking-tight text-foreground transition group-hover:text-accent"
        >
          {post.title}
        </Link>
        <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
        {post.tags.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {post.tags.slice(0, 4).map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
