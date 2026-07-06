'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/cn';
import { toast } from 'sonner';
import type { BlogPost } from '@/lib/content/schema';

export function BlogListAdmin({ initial }: { initial: BlogPost[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>(initial);
  const [busy, setBusy] = useState<number | null>(null);

  async function toggleStatus(p: BlogPost) {
    const next: BlogPost['status'] = p.status === 'published' ? 'draft' : 'published';
    setBusy(p.id);
    try {
      const res = await fetch(`/api/blog/${p.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Update failed');
      }
      const updated = (await res.json()) as BlogPost;
      setPosts((arr) => arr.map((x) => (x.id === p.id ? updated : x)));
      toast.success(next === 'published' ? 'Published' : 'Unpublished');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: BlogPost) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setBusy(p.id);
    try {
      const res = await fetch(`/api/blog/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Delete failed');
      }
      setPosts((arr) => arr.filter((x) => x.id !== p.id));
      toast.success('Deleted');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Blog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts and published posts. Public list at
            <span className="text-foreground"> /blog</span> · RSS at
            <span className="text-foreground"> /blog/rss.xml</span>.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/admin/blog/new">
            <Plus data-icon="inline-start" /> New post
          </Link>
        </Button>
      </header>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="p-0">
          {posts.length === 0 ? (
            <div className="flex items-center justify-between p-6 text-sm text-muted-foreground">
              No blog posts yet.{' '}
              <Link href="/admin/blog/new" className="text-accent hover:underline">
                Create the first one →
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Published</TableHead>
                    <TableHead className="hidden md:table-cell">Updated</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((p) => {
                    const isBusy = busy === p.id;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {p.title || (
                              <span className="text-muted-foreground">Untitled</span>
                            )}
                          </div>
                          {p.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {p.tags.slice(0, 3).map((t) => (
                                <Badge key={t} variant="secondary" className="text-[10px]">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                          /{p.slug}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={p.status === 'published' ? 'default' : 'secondary'}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">
                          {p.publishedAt ? formatDate(p.publishedAt) : '—'}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">
                          {formatDate(p.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              aria-label="Edit"
                              title="Edit"
                            >
                              <Link href={`/admin/blog/${p.id}`}>
                                <Pencil />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={
                                p.status === 'published' ? 'Unpublish' : 'Publish'
                              }
                              title={p.status === 'published' ? 'Unpublish' : 'Publish'}
                              onClick={() => void toggleStatus(p)}
                              disabled={isBusy}
                            >
                              {isBusy ? (
                                <Loader2 className="animate-spin" />
                              ) : p.status === 'published' ? (
                                <EyeOff />
                              ) : (
                                <Eye />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete"
                              title="Delete"
                              onClick={() => void remove(p)}
                              disabled={isBusy}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
