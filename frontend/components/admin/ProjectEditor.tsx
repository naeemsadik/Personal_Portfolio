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
import { RichText } from '@/components/admin/RichText';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { slugify } from '@/lib/cn';
import { toast } from 'sonner';
import type { Project } from '@/lib/content/schema';

type Mode = 'create' | 'edit';
type Status = 'draft' | 'published';

type ProjectWithStatus = Project & { status?: Status };

function blankProject(): ProjectWithStatus {
  return {
    id: '',
    title: '',
    summary: '',
    description: '',
    tech: [],
    liveUrl: null,
    repoUrl: null,
    coverUrl: '',
    featured: false,
    order: 0,
    status: 'draft',
  };
}

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; initial: ProjectWithStatus };

export function ProjectEditor(props: Props) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithStatus>(
    props.mode === 'edit' ? props.initial : blankProject(),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function patch(p: Partial<ProjectWithStatus>) {
    setProject((cur) => ({ ...cur, ...p }));
  }

  async function save() {
    if (!project.title.trim() || !project.summary.trim()) {
      toast.error('Title and summary are required.');
      return;
    }
    setSaving(true);
    try {
      const id = project.id || slugify(project.title);
      if (!id) {
        toast.error('Could not derive a slug from the title.');
        setSaving(false);
        return;
      }
      const payload: ProjectWithStatus = {
        ...project,
        id,
        status: project.status ?? 'published',
      };
      const res = await fetch('/api/content/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Save failed');
      }
      const saved = (await res.json()) as ProjectWithStatus;
      setProject(saved);
      toast.success('Saved');
      if (props.mode === 'create') {
        router.replace(`/admin/projects/${encodeURIComponent(saved.id)}`);
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
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/content/projects', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: project.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Delete failed');
      }
      toast.success('Deleted');
      router.replace('/admin/projects');
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
            <Link href="/admin/projects">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {props.mode === 'create' ? 'New project' : 'Edit project'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {props.mode === 'create'
                ? 'Drafts are private until you publish.'
                : 'Changes save to the database and revalidate the public list.'}
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
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={project.title}
                onChange={(ev) => patch({ title: ev.target.value })}
                placeholder="Project name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Slug (auto from title, editable)</Label>
              <Input
                value={project.id}
                onChange={(ev) => patch({ id: ev.target.value })}
                placeholder="my-project"
                disabled={props.mode === 'edit'}
                className="font-mono text-xs"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Summary</Label>
              <Input
                value={project.summary}
                onChange={(ev) => patch({ summary: ev.target.value })}
                placeholder="One-sentence summary"
              />
            </div>
            <div className="grid gap-2">
              <Label>Tech (comma-separated)</Label>
              <Input
                value={project.tech.join(', ')}
                onChange={(ev) =>
                  patch({
                    tech: ev.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="React, Next.js, FastAPI"
              />
            </div>
            <div className="grid gap-2">
              <Label>Order</Label>
              <Input
                type="number"
                value={project.order}
                onChange={(ev) => patch({ order: Number(ev.target.value) || 0 })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Live URL</Label>
              <Input
                placeholder="https://…"
                value={project.liveUrl ?? ''}
                onChange={(ev) => patch({ liveUrl: ev.target.value || null })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Repository URL</Label>
              <Input
                placeholder="https://github.com/…"
                value={project.repoUrl ?? ''}
                onChange={(ev) => patch({ repoUrl: ev.target.value || null })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Featured on home</Label>
              <div className="flex h-9 items-center gap-3 rounded-md border border-input bg-background px-3">
                <Switch
                  checked={project.featured}
                  onCheckedChange={(v) => patch({ featured: v })}
                />
                <span className="text-sm">
                  {project.featured ? 'Featured' : 'Not featured'}
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="flex h-9 items-center gap-3 rounded-md border border-input bg-background px-3">
                <Switch
                  checked={(project.status ?? 'published') === 'published'}
                  onCheckedChange={(v) =>
                    patch({ status: v ? 'published' : 'draft' })
                  }
                />
                <span className="text-sm">
                  {(project.status ?? 'published') === 'published'
                    ? 'Published'
                    : 'Draft'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Description (Markdown)</Label>
            <RichText
              value={project.description}
              onChange={(v) => patch({ description: v })}
              rows={8}
            />
          </div>

          <ImageUploader
            label="Cover image"
            hint="Recommended 16:10 (e.g. 1280×800)."
            value={project.coverUrl ?? ''}
            onChange={(url) => patch({ coverUrl: url })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
