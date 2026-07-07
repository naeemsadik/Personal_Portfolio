'use client';

/**
 * Snapshot Manager — admin UI for the static-publish system.
 *
 * Sections:
 *   1. Overview card — current live snapshot + Enable/Disable toggle.
 *   2. Generate — start a new snapshot, watch progress, preview.
 *   3. History table — every snapshot with status, size, actions.
 *
 * Data:
 *   - Site state from `/api/site-state` (public).
 *   - Snapshot list/detail from `/api/snapshots/*` (admin-gated).
 *
 * Polling: a single `useEffect` polls `/api/snapshots/{id}/progress`
 * every 1s while any row is `generating`. Cancels the timer on unmount
 * or when no rows are generating.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes,
  ExternalLink,
  Eye,
  Loader2,
  Power,
  RefreshCw,
  AlertTriangle,
  Plus,
  Trash2,
  StopCircle,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

type SiteState = {
  snapshotMode: 'off' | 'published';
  publishedVersion: string | null;
};

type SnapshotStatus =
  | 'generating'
  | 'generated'
  | 'published'
  | 'archived'
  | 'failed';

type Snapshot = {
  id: number;
  version: string;
  status: SnapshotStatus;
  notes: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  totalSizeBytes: number;
  pageCount: number;
  pagesFailedCount: number;
  warnings: unknown[];
  errorMessage: string | null;
  creatorEmail: string | null;
  baseUrl: string | null;
  currentPath: string | null;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(s);
  const d = new Date(hasTimezone ? s : `${s}Z`);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka',
  }).format(d);
}

function durationSec(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const startHasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(start);
  const endHasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(end);
  const startDate = new Date(startHasTimezone ? start : `${start}Z`);
  const endDate = new Date(endHasTimezone ? end : `${end}Z`);
  return Math.max(0, (endDate.getTime() - startDate.getTime()) / 1000);
}

function statusBadge(status: SnapshotStatus) {
  switch (status) {
    case 'generating':
      return (
        <Badge variant="secondary" className="bg-sky-500/15 text-sky-300">
          <Loader2 className="mr-1 size-3 animate-spin" /> Generating
        </Badge>
      );
    case 'generated':
      return (
        <Badge variant="secondary" className="bg-amber-500/15 text-amber-200">
          Draft
        </Badge>
      );
    case 'published':
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-400" />
          Active
        </Badge>
      );
    case 'archived':
      return <Badge variant="outline">Archived</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
  }
}

export function SnapshotsAdmin() {
  const [state, setState] = useState<SiteState | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate form state
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Track in-flight action per snapshot row id (so spinners don't clash)
  const [busy, setBusy] = useState<number | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch('/api/site-state', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState((await res.json()) as SiteState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load state');
    }
  }, []);

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/snapshots?limit=50', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items?: Snapshot[] } | Snapshot[];
      const items = Array.isArray(data) ? data : (data.items ?? []);
      setSnapshots(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadState(), loadSnapshots()]);
  }, [loadState, loadSnapshots]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  // Polling: while any snapshot is generating, poll /progress every 1s.
  useEffect(() => {
    const inFlight = snapshots.filter((s) => s.status === 'generating');
    if (inFlight.length === 0) {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }
    pollTimerRef.current = setTimeout(async () => {
      await Promise.all(
        inFlight.map(async (s) => {
          try {
            const res = await fetch(
              `/api/snapshots/${s.id}/progress`,
              { cache: 'no-store' },
            );
            if (!res.ok) return;
            const fresh = (await res.json()) as Snapshot;
            setSnapshots((arr) =>
              arr.map((x) => (x.id === fresh.id ? fresh : x)),
            );
          } catch {
            // ignore — next tick will retry
          }
        }),
      );
    }, 1000);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [snapshots]);

  // ---- Mutations --------------------------------------------------------

  async function setMode(mode: 'off' | 'published', version?: string) {
    setToggling(true);
    try {
      const res = await fetch('/api/site-state/set', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, version }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to update');
      }
      const next = (await res.json()) as SiteState;
      setState(next);
      toast.success(
        mode === 'published'
          ? `Snapshot mode enabled — ${next.publishedVersion ?? ''}`
          : 'Snapshot mode disabled — live SSR is back',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setToggling(false);
    }
  }

  async function createSnapshot() {
    setCreating(true);
    try {
      const body: { notes?: string } = {};
      if (notes.trim()) body.notes = notes.trim();
      const res = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to create');
      }
      const snap = (await res.json()) as Snapshot;
      setSnapshots((arr) => [snap, ...arr]);
      setNotes('');
      toast.success(`Generating ${snap.version}…`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function cancelSnapshot(s: Snapshot) {
    setBusy(s.id);
    try {
      const res = await fetch(`/api/snapshots/${s.id}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Cancel failed');
      }
      const fresh = (await res.json()) as Snapshot;
      setSnapshots((arr) =>
        arr.map((x) => (x.id === s.id ? fresh : x)),
      );
      toast.success('Cancel requested');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(null);
    }
  }

  async function deleteSnapshot(s: Snapshot) {
    if (
      !window.confirm(
        `Delete snapshot ${s.version}? This removes its files from disk.`,
      )
    )
      return;
    setBusy(s.id);
    try {
      const res = await fetch(`/api/snapshots/${s.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Delete failed');
      }
      setSnapshots((arr) => arr.filter((x) => x.id !== s.id));
      toast.success('Deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(null);
    }
  }

  async function publishSnapshot(s: Snapshot) {
    if (
      !window.confirm(
        `Publish ${s.version}?\n\nThe currently-live snapshot (if any) will be archived. Live site changes take effect within 10 seconds.`,
      )
    )
      return;
    setBusy(s.id);
    try {
      const res = await fetch(`/api/snapshots/${s.id}/publish`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Publish failed');
      }
      const fresh = (await res.json()) as Snapshot;
      setSnapshots((arr) =>
        arr.map((x) => (x.id === s.id ? fresh : x)),
      );
      toast.success(`Published ${s.version}`);
      void loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(null);
    }
  }

  async function rollbackSnapshot(s: Snapshot) {
    if (
      !window.confirm(
        `Restore ${s.version}?\n\nThe currently-live snapshot will be archived.`,
      )
    )
      return;
    setBusy(s.id);
    try {
      const res = await fetch(`/api/snapshots/${s.id}/rollback`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Rollback failed');
      }
      const fresh = (await res.json()) as Snapshot;
      setSnapshots((arr) =>
        arr.map((x) => (x.id === s.id ? fresh : x)),
      );
      toast.success(`Restored ${s.version}`);
      void loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setBusy(null);
    }
  }

  async function archiveSnapshot(s: Snapshot) {
    if (!window.confirm(`Archive ${s.version}? Its files stay on disk.`))
      return;
    setBusy(s.id);
    try {
      const res = await fetch(`/api/snapshots/${s.id}/archive`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Archive failed');
      }
      const fresh = (await res.json()) as Snapshot;
      setSnapshots((arr) =>
        arr.map((x) => (x.id === s.id ? fresh : x)),
      );
      toast.success('Archived');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setBusy(null);
    }
  }

  const isPublished = state?.snapshotMode === 'published';
  const liveVersion = state?.publishedVersion ?? null;
  // The "Re-enable" target: when mode is off, we want the most recent
  // row that is either still `published` (e.g. user disabled but didn't
  // rollback) or `archived` after a disable. Pick the newest of those
  // so re-enable goes back to whatever was last live.
  const lastPublishable = useMemo(
    () =>
      snapshots
        .filter((s) => s.status === 'published' || s.status === 'archived')
        .find(
          (s) => s.status === 'published' || s.publishedAt !== null,
        ) ?? null,
    [snapshots],
  );
  const inFlight = useMemo(
    () => snapshots.filter((s) => s.status === 'generating'),
    [snapshots],
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Snapshot Manager
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manually bake the public site into a versioned static directory
            and switch the live site over to it. Useful for safe rollbacks
            and a fully static deliverable.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void reloadAll()}
          disabled={loading}
          className="rounded-full"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          Refresh
        </Button>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4" />
          <div>{error}</div>
        </div>
      )}

      {/* Overview */}
      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Current live snapshot
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Boxes className="size-5 text-accent" />
                <div className="font-display text-2xl font-semibold tracking-tight">
                  {isPublished && liveVersion
                    ? liveVersion
                    : 'No snapshot published'}
                </div>
                {isPublished ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">
                    <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-400" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Off</Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {isPublished
                  ? 'All public requests are served from the static snapshot directory. The Next.js + FastAPI stack is bypassed.'
                  : 'Public requests use live SSR (Next.js renders each request against FastAPI + SQLite).'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isPublished && liveVersion && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  <a href="/" target="_blank" rel="noreferrer">
                    <ExternalLink data-icon="inline-start" /> View live
                  </a>
                </Button>
              )}
              {isPublished ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void setMode('off')}
                  disabled={toggling}
                  className="rounded-full"
                >
                  {toggling ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Power data-icon="inline-start" />
                  )}
                  Disable snapshot mode
                </Button>
              ) : lastPublishable ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void rollbackSnapshot(lastPublishable)}
                  disabled={toggling}
                  className="rounded-full"
                  title={`Re-enable ${lastPublishable.version}`}
                >
                  {toggling ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Power data-icon="inline-start" />
                  )}
                  Re-enable {lastPublishable.version}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-md border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Emergency disable.</strong>{' '}
            Set{' '}
            <code className="rounded bg-card px-1.5 py-0.5 text-xs">
              EMERGENCY_DISABLE_SNAPSHOT_MODE=1
            </code>{' '}
            in the Next.js environment and restart — middleware short-circuits
            and live SSR is restored immediately, even if{' '}
            <code className="rounded bg-card px-1.5 py-0.5 text-xs">
              site_settings
            </code>{' '}
            points at a snapshot.
          </div>
        </CardContent>
      </Card>

      {/* Generate */}
      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-lg font-semibold">
                Generate snapshot
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Crawl all public pages, mirror uploads, write static HTML to{' '}
                <code className="rounded bg-card px-1.5 py-0.5 text-xs">
                  frontend/public/__snapshots__/&lt;version&gt;/
                </code>
                . The live site is not affected.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="snap-notes">Release notes (optional)</Label>
              <Input
                id="snap-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Added IoT Tracker project, refreshed bio"
                maxLength={2000}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => void createSnapshot()}
                disabled={creating || inFlight.length > 0}
                className="rounded-full"
              >
                {creating ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Plus data-icon="inline-start" />
                )}
                {inFlight.length > 0
                  ? 'Generation in progress…'
                  : 'Generate snapshot'}
              </Button>
            </div>
          </div>

          {inFlight.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
              <div className="flex items-center gap-2 text-sky-200">
                <Loader2 className="size-3.5 animate-spin" />
                <span>
                  {inFlight.length} snapshot{inFlight.length === 1 ? '' : 's'}{' '}
                  generating…
                </span>
              </div>
              {inFlight.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                >
                  <code className="rounded bg-card px-1.5 py-0.5">
                    {s.version}
                  </code>
                  <span className="truncate">
                    {s.currentPath ?? 'starting…'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void cancelSnapshot(s)}
                    disabled={busy === s.id}
                    className="h-6 rounded-full px-2 text-xs"
                  >
                    <StopCircle data-icon="inline-start" />
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card className="border-border/60 bg-card/40">
        <CardContent className="p-0">
          {snapshots.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No snapshots yet. Generate one above to get started.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Pages
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Size
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Created (BDT)
                    </TableHead>
                    <TableHead className="w-40 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((s) => {
                    const isBusy = busy === s.id;
                    const dur = durationSec(s.startedAt, s.finishedAt);
                    const isLive = liveVersion === s.version;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {s.version}
                          </div>
                          {s.notes && (
                            <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {s.notes}
                            </div>
                          )}
                          {s.errorMessage && (
                            <div className="mt-1 line-clamp-1 text-xs text-destructive">
                              {s.errorMessage}
                            </div>
                          )}
                          {dur !== null && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {dur.toFixed(1)}s
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(s.status)}</TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {s.pageCount > 0
                            ? `${s.pageCount - s.pagesFailedCount}/${s.pageCount}`
                            : '—'}
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {s.totalSizeBytes > 0
                            ? formatBytes(s.totalSizeBytes)
                            : '—'}
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                          {formatDate(s.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {(s.status === 'generated' ||
                              s.status === 'published' ||
                              s.status === 'archived') && (
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                aria-label="Preview"
                                title="Preview snapshot"
                              >
                                <a
                                  href={`/?snapshot=${encodeURIComponent(s.version)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Eye />
                                </a>
                              </Button>
                            )}
                            {s.status === 'generated' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void publishSnapshot(s)}
                                disabled={isBusy}
                                aria-label="Publish"
                                title="Publish snapshot"
                              >
                                <Upload />
                              </Button>
                            )}
                            {s.status === 'published' && !isLive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void rollbackSnapshot(s)}
                                disabled={isBusy}
                                aria-label="Rollback"
                                title="Roll back to this version"
                              >
                                <RotateCcw />
                              </Button>
                            )}
                            {s.status === 'archived' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void rollbackSnapshot(s)}
                                disabled={isBusy}
                                aria-label="Restore"
                                title="Restore this version"
                              >
                                <RotateCcw />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete"
                              title="Delete"
                              onClick={() => void deleteSnapshot(s)}
                              disabled={isBusy || s.status === 'published'}
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
