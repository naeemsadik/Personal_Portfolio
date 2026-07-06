import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TagPill } from '@/components/blog/TagPill';
import { ReadingTime } from '@/components/blog/ReadingTime';
import { formatDate } from '@/lib/cn';
import type { BlogPost } from '@/lib/content/schema';

type Props = {
  post: BlogPost;
};

export function BlogPostView({ post }: Props) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Link
          href="/blog"
          className="text-xs uppercase tracking-[0.3em] text-accent/80 transition hover:text-accent"
        >
          &larr; All posts
        </Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          {post.title}
        </h1>
        <p className="text-lg text-muted-foreground">{post.excerpt}</p>
        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          {post.publishedAt ? <span>{formatDate(post.publishedAt)}</span> : null}
          {post.publishedAt ? <span aria-hidden>·</span> : null}
          <ReadingTime minutes={post.readingTimeMin} />
        </div>
      </header>

      {post.coverUrl ? (
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border/60">
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-pre:rounded-xl prose-pre:border prose-pre:border-border/60 prose-pre:bg-card/60">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </div>

      {post.tags.length > 0 ? (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-6">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Tags
          </span>
          {post.tags.map((t) => (
            <TagPill key={t} tag={t} />
          ))}
        </footer>
      ) : null}
    </article>
  );
}
