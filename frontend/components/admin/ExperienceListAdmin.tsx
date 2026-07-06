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
import type { ExperienceEntry } from '@/lib/content/schema';

type EntryWithStatus = ExperienceEntry & { status?: 'draft' | 'published' };

const KIND_LABEL: Record<ExperienceEntry['kind'], string> = {
  work: 'Work',
  education: 'Education',
  leadership: 'Leadership',
  volunteer: 'Volunteer',
  achievement: 'Achievement',
};

export function ExperienceListAdmin({ initial }: { initial: EntryWithStatus[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryWithStatus[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleStatus(e: EntryWithStatus) {
    const next: 'draft' | 'published' =
      e.status === 'published' ? 'draft' : 'published';
    setBusy(e.id);
    try {
      const res = await fetch(
        `/api/content/experience/${encodeURIComponent(e.id)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: next }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Update failed');
      }
      const updated = (await res.json()) as EntryWithStatus;
      setEntries((arr) => arr.map((x) => (x.id === e.id ? updated : x)));
      toast.success(next === 'published' ? 'Published' : 'Unpublished');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  async function remove(e: EntryWithStatus) {
    if (!window.confirm(`Delete "${e.title || e.organization}"? This cannot be undone.`)) return;
    setBusy(e.id);
    try {
      const res = await fetch('/api/content/experience', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: e.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Delete failed');
      }
      setEntries((arr) => arr.filter((x) => x.id !== e.id));
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
            Experience
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Education, leadership, volunteering, achievements, and work — all in
            one timeline.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/admin/experience/new">
            <Plus data-icon="inline-start" /> New entry
          </Link>
        </Button>
      </header>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="flex items-center justify-between p-6 text-sm text-muted-foreground">
              No entries yet.{' '}
              <Link href="/admin/experience/new" className="text-accent hover:underline">
                Create the first one →
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Org</TableHead>
                    <TableHead className="hidden md:table-cell">Kind</TableHead>
                    <TableHead className="hidden md:table-cell">When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => {
                    const isBusy = busy === e.id;
                    const status: 'draft' | 'published' =
                      e.status ?? 'published';
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {e.title || (
                              <span className="text-muted-foreground">Untitled</span>
                            )}
                          </div>
                          {e.location && (
                            <div className="text-xs text-muted-foreground">
                              {e.location}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {e.organization}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{KIND_LABEL[e.kind]}</Badge>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">
                          {formatDate(e.startDate)} — {e.endDate ? formatDate(e.endDate) : 'Present'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={status === 'published' ? 'default' : 'secondary'}
                          >
                            {status}
                          </Badge>
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
                              <Link href={`/admin/experience/${encodeURIComponent(e.id)}`}>
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
                              onClick={() => void toggleStatus(e)}
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
                              onClick={() => void remove(e)}
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
