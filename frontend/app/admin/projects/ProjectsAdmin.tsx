'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { RichText } from '@/components/admin/RichText';
import { SaveBar } from '@/components/admin/SaveBar';
import { slugify } from '@/lib/cn';
import type { Project } from '@/lib/content/schema';

function blankProject(): Project {
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
  };
}

export function ProjectsAdmin({ initial }: { initial: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initial);

  function patch(i: number, p: Partial<Project>) {
    setProjects((ps) => ps.map((e, idx) => (idx === i ? { ...e, ...p } : e)));
  }
  function remove(i: number) {
    setProjects((ps) => ps.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Featured projects appear on the home page; the full list is at
            <span className="text-foreground"> /projects</span>.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => setProjects((ps) => [...ps, { ...blankProject(), order: ps.length }])}
        >
          <Plus data-icon="inline-start" /> New project
        </Button>
      </header>

      {projects.length === 0 ? (
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex items-center justify-between p-6 text-sm text-muted-foreground">
            No projects yet — add one to get started.
          </CardContent>
        </Card>
      ) : (
        projects.map((p, i) => (
          <Card key={i} className="border-border/60 bg-card/40">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <div className="font-display text-lg font-semibold">
                  {p.title || `Project ${i + 1}`}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                  aria-label="Delete project"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input
                    value={p.title}
                    onChange={(ev) => patch(i, { title: ev.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tech (comma-separated)</Label>
                  <Input
                    value={p.tech.join(', ')}
                    onChange={(ev) =>
                      patch(i, {
                        tech: ev.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Summary</Label>
                  <Input
                    value={p.summary}
                    onChange={(ev) => patch(i, { summary: ev.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Live URL</Label>
                  <Input
                    placeholder="https://…"
                    value={p.liveUrl ?? ''}
                    onChange={(ev) => patch(i, { liveUrl: ev.target.value || null })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Repository URL</Label>
                  <Input
                    placeholder="https://github.com/…"
                    value={p.repoUrl ?? ''}
                    onChange={(ev) => patch(i, { repoUrl: ev.target.value || null })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Description (Markdown)</Label>
                <RichText
                  value={p.description}
                  onChange={(v) => patch(i, { description: v })}
                  rows={6}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.featured}
                    onCheckedChange={(v) => patch(i, { featured: v })}
                  />
                  <Label className="cursor-pointer">Featured on home</Label>
                </div>
                <div className="text-xs text-muted-foreground">
                  Order: {p.order}
                </div>
              </div>

              <ImageUploader
                label="Cover image"
                hint="Recommended 16:10 (e.g. 1280×800)."
                value={p.coverUrl}
                onChange={(url) => patch(i, { coverUrl: url })}
              />
            </CardContent>
          </Card>
        ))
      )}

      <SaveBar
        onSave={async () => {
          for (const p of projects) {
            const payload: Project = {
              ...p,
              id: p.id || slugify(p.title),
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
          }
        }}
      />
    </div>
  );
}
