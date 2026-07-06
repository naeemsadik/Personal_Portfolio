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
  Star,
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
import { toast } from 'sonner';
import type { Project } from '@/lib/content/schema';

type ProjectWithStatus = Project & { status?: 'draft' | 'published' };

export function ProjectsListAdmin({ initial }: { initial: ProjectWithStatus[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithStatus[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleStatus(p: ProjectWithStatus) {
    const next: 'draft' | 'published' =
      p.status === 'published' ? 'draft' : 'published';
    setBusy(p.id);
    try {
      const res = await fetch(`/api/content/projects/${encodeURIComponent(p.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Update failed');
      }
      const updated = (await res.json()) as ProjectWithStatus;
      setProjects((arr) => arr.map((x) => (x.id === p.id ? updated : x)));
      toast.success(next === 'published' ? 'Published' : 'Unpublished');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: ProjectWithStatus) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setBusy(p.id);
    try {
      const res = await fetch('/api/content/projects', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Delete failed');
      }
      setProjects((arr) => arr.filter((x) => x.id !== p.id));
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
            Projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Featured projects appear on the home page; the full list is at
            <span className="text-foreground"> /projects</span>.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/admin/projects/new">
            <Plus data-icon="inline-start" /> New project
          </Link>
        </Button>
      </header>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="flex items-center justify-between p-6 text-sm text-muted-foreground">
              No projects yet.{' '}
              <Link href="/admin/projects/new" className="text-accent hover:underline">
                Create the first one →
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Tech</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Order</TableHead>
                    <TableHead className="w-36 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => {
                    const isBusy = busy === p.id;
                    const status: 'draft' | 'published' =
                      p.status ?? 'published';
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            {p.featured && (
                              <Star className="size-3.5 fill-accent text-accent" />
                            )}
                            {p.title || (
                              <span className="text-muted-foreground">Untitled</span>
                            )}
                          </div>
                          {p.summary && (
                            <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {p.summary}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex max-w-[260px] flex-wrap gap-1">
                            {p.tech.slice(0, 4).map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px]">
                                {t}
                              </Badge>
                            ))}
                            {p.tech.length > 4 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{p.tech.length - 4}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={status === 'published' ? 'default' : 'secondary'}
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {p.order}
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
                              <Link href={`/admin/projects/${encodeURIComponent(p.id)}`}>
                                <Pencil />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={
                                status === 'published' ? 'Unpublish' : 'Publish'
                              }
                              title={status === 'published' ? 'Unpublish' : 'Publish'}
                              onClick={() => void toggleStatus(p)}
                              disabled={isBusy}
                            >
                              {isBusy ? (
                                <Loader2 className="animate-spin" />
                              ) : status === 'published' ? (
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
