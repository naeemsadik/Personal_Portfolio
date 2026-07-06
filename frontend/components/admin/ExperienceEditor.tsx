'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichText } from '@/components/admin/RichText';
import { slugify } from '@/lib/cn';
import { toast } from 'sonner';
import type { ExperienceEntry } from '@/lib/content/schema';

type Mode = 'create' | 'edit';
type Status = 'draft' | 'published';

type EntryWithStatus = ExperienceEntry & { status?: Status };

const KINDS: Array<{ value: ExperienceEntry['kind']; label: string }> = [
  { value: 'work', label: 'Work' },
  { value: 'education', label: 'Education' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'achievement', label: 'Achievement' },
];

function blankEntry(): EntryWithStatus {
  return {
    id: '',
    kind: 'work',
    title: '',
    organization: '',
    location: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    description: '',
    tags: [],
    meta: '',
    order: 0,
    status: 'draft',
  };
}

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; initial: EntryWithStatus };

export function ExperienceEditor(props: Props) {
  const router = useRouter();
  const [entry, setEntry] = useState<EntryWithStatus>(
    props.mode === 'edit' ? props.initial : blankEntry(),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function patch(p: Partial<EntryWithStatus>) {
    setEntry((cur) => ({ ...cur, ...p }));
  }

  async function save() {
    if (!entry.title.trim() || !entry.organization.trim()) {
      toast.error('Title and organization are required.');
      return;
    }
    setSaving(true);
    try {
      const id =
        entry.id ||
        slugify(
          `${entry.organization}-${entry.title}-${entry.startDate}`,
        );
      if (!id) {
        toast.error('Could not derive a slug from the title.');
        setSaving(false);
        return;
      }
      const payload: EntryWithStatus = {
        ...entry,
        id,
        status: entry.status ?? 'published',
      };
      const res = await fetch('/api/content/experience', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Save failed');
      }
      const saved = (await res.json()) as EntryWithStatus;
      setEntry(saved);
      toast.success('Saved');
      if (props.mode === 'create') {
        router.replace(`/admin/experience/${encodeURIComponent(saved.id)}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (props.mode !== 'edit') return;
    if (!window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/content/experience', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Delete failed');
      }
      toast.success('Deleted');
      router.replace('/admin/experience');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to list">
            <Link href="/admin/experience">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {props.mode === 'create' ? 'New experience' : 'Edit experience'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {props.mode === 'create'
                ? 'Drafts are private until you publish.'
                : 'Changes save to the database and revalidate the public timeline.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {props.mode === 'edit' && (
            <Button
              variant="outline"
              className="rounded-full text-destructive"
              onClick={() => void remove()}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              Delete
            </Button>
          )}
          <Button className="rounded-full" onClick={() => void save()} disabled={saving}>
            {saving ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            Save
          </Button>
        </div>
      </header>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Kind</Label>
              <Select
                value={entry.kind}
                onValueChange={(v) =>
                  patch({ kind: v as ExperienceEntry['kind'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Title / Role</Label>
              <Input
                value={entry.title}
                onChange={(ev) => patch({ title: ev.target.value })}
                placeholder="Senior Engineer"
              />
            </div>
            <div className="grid gap-2">
              <Label>Organization</Label>
              <Input
                value={entry.organization}
                onChange={(ev) => patch({ organization: ev.target.value })}
                placeholder="Company / University / Project"
              />
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Input
                value={entry.location ?? ''}
                onChange={(ev) => patch({ location: ev.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={entry.startDate.slice(0, 10)}
                onChange={(ev) => patch({ startDate: ev.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>End date</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={entry.endDate?.slice(0, 10) ?? ''}
                  disabled={entry.endDate === null}
                  onChange={(ev) => patch({ endDate: ev.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={entry.endDate === null}
                    onCheckedChange={(present) =>
                      patch({
                        endDate: present
                          ? null
                          : new Date().toISOString().slice(0, 10),
                      })
                    }
                  />
                  <span className="text-xs text-muted-foreground">Present</span>
                </div>
              </div>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Meta (e.g. CGPA, GPA)</Label>
              <Input
                value={entry.meta ?? ''}
                onChange={(ev) => patch({ meta: ev.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Order</Label>
              <Input
                type="number"
                value={entry.order}
                onChange={(ev) => patch({ order: Number(ev.target.value) || 0 })}
              />
            </div>
            <div className="grid gap-2 md:col-span-3">
              <Label>Status</Label>
              <div className="flex h-9 items-center gap-3 rounded-md border border-input bg-background px-3">
                <Switch
                  checked={(entry.status ?? 'published') === 'published'}
                  onCheckedChange={(v) =>
                    patch({ status: v ? 'published' : 'draft' })
                  }
                />
                <span className="text-sm">
                  {(entry.status ?? 'published') === 'published'
                    ? 'Published'
                    : 'Draft'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <RichText
              value={entry.description}
              onChange={(v) => patch({ description: v })}
              rows={6}
            />
          </div>

          <div className="grid gap-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={entry.tags.join(', ')}
              onChange={(ev) =>
                patch({
                  tags: ev.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
