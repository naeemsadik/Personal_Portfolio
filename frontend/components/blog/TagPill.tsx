import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  tag: string;
  className?: string;
};

export function TagPill({ tag, className }: Props) {
  return (
    <Link
      href={`/blog/tag/${encodeURIComponent(tag)}`}
      className={cn(
        'inline-flex items-center rounded-full border border-border/60 bg-card/40 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition hover:border-accent/40 hover:bg-accent/5 hover:text-accent',
        className,
      )}
    >
      {tag}
    </Link>
  );
}
