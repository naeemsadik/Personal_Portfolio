import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-accent/80">404</p>
      <h1 className="font-display text-5xl font-semibold md:text-6xl">
        Lost in the void.
      </h1>
      <p className="max-w-md text-muted-foreground">
        The page you're looking for doesn't exist — or has been moved.
      </p>
      <Button asChild className="rounded-full">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
