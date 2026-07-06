'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SaveBar } from '@/components/admin/SaveBar';
import { RichText } from '@/components/admin/RichText';
import { slugify, formatDate } from '@/lib/cn';
import type { ExperienceEntry } from '@/lib/content/schema';

function blankEntry(): ExperienceEntry {
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
  };
}

export function ExperienceAdmin({ initial }: { initial: ExperienceEntry[] }) {
  const [entries, setEntries] = useState<ExperienceEntry[]>(initial);

  function patch(i: number, p: Partial<ExperienceEntry>) {
    setEntries((es) => es.map((e, idx) => (idx === i ? { ...e, ...p } : e)));
  }
  function remove(i: number) {
    setEntries((es) => es.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Experience
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Education, leadership, volunteering, and work — all in one timeline.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => setEntries((es) => [...es, { ...blankEntry(), order: es.length }])}
        >
          <Plus data-icon="inline-start" /> New entry
        </Button>
      </header>

      {entries.length === 0 ? (
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex items-center justify-between p-6 text-sm text-muted-foreground">
            No entries yet — add one to get started.
          </CardContent>
        </Card>
      ) : (
        entries.map((e, i) => (
          <Card key={i} className="border-border/60 bg-card/40">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <div className="font-display text-lg font-semibold">
                  {e.title || e.organization || `Entry ${i + 1}`}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                  aria-label="Delete entry"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Kind</Label>
                  <Select
                    value={e.kind}
                    onValueChange={(v) => patch(i, { kind: v as ExperienceEntry['kind'] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="leadership">Leadership</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Title / Role</Label>
                  <Input
                    value={e.title}
                    onChange={(ev) => patch(i, { title: ev.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Organization</Label>
                  <Input
                    value={e.organization}
                    onChange={(ev) => patch(i, { organization: ev.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Location</Label>
                  <Input
                    value={e.location ?? ''}
                    onChange={(ev) => patch(i, { location: ev.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={e.startDate.slice(0, 10)}
                    onChange={(ev) => patch(i, { startDate: ev.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End date</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={e.endDate?.slice(0, 10) ?? ''}
                      disabled={e.endDate === null}
                      onChange={(ev) => patch(i, { endDate: ev.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={e.endDate === null}
                        onCheckedChange={(present) =>
                          patch(i, { endDate: present ? null : new Date().toISOString().slice(0, 10) })
                        }
                      />
                      <span className="text-xs text-muted-foreground">Present</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 md:col-span-3">
                  <Label>Meta (e.g. CGPA, GPA)</Label>
                  <Input
                    value={e.meta ?? ''}
                    onChange={(ev) => patch(i, { meta: ev.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <RichText
                  value={e.description}
                  onChange={(v) => patch(i, { description: v })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={e.tags.join(', ')}
                  onChange={(ev) =>
                    patch(i, {
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
        ))
      )}

      <SaveBar
        onSave={async () => {
          for (const e of entries) {
            const payload: ExperienceEntry = {
              ...e,
              id: e.id || slugify(`${e.organization}-${e.title}-${e.startDate}`),
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
          }
        }}
      />
    </div>
  );
}
