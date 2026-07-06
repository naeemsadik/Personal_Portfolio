'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { SaveBar } from '@/components/admin/SaveBar';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { CvUploader } from '@/components/admin/CvUploader';
import { SkillsEditor } from '@/components/admin/SkillsEditor';
import type { SettingsContent } from '@/lib/content/schema';

function emptySkills(): SettingsContent['skills'] {
  return {
    languages: [],
    frameworks: [],
    tools: [],
    frontend: [],
    backend: [],
    infrastructure: [],
  };
}

export function SettingsAdmin({ initial }: { initial: SettingsContent }) {
  const [s, setS] = useState<SettingsContent>(initial);

  function patch<K extends keyof SettingsContent>(k: K, v: SettingsContent[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Site-wide metadata, contact info, and skills shown across the
          portfolio.
        </p>
      </header>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Site title</Label>
              <Input
                value={s.siteTitle}
                onChange={(e) => patch('siteTitle', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Accent color</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={s.accentColor}
                  onChange={(e) => patch('accentColor', e.target.value)}
                  placeholder="#7cf5b3"
                />
                <span
                  className="size-9 rounded-md border border-border"
                  style={{ background: s.accentColor }}
                  aria-hidden
                />
              </div>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={s.description}
                onChange={(e) => patch('description', e.target.value)}
              />
            </div>
            <ImageUploader
              label="OG image"
              hint="1200×630 recommended. Used as the social share preview."
              value={s.ogImage}
              onChange={(url) => patch('ogImage', url)}
              className="md:col-span-2"
            />
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={s.email ?? ''}
                onChange={(e) => patch('email', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={s.phone ?? ''}
                onChange={(e) => patch('phone', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Input
                value={s.location ?? ''}
                onChange={(e) => patch('location', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>GitHub</Label>
              <Input
                value={s.github ?? ''}
                onChange={(e) => patch('github', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>LinkedIn</Label>
              <Input
                value={s.linkedin ?? ''}
                onChange={(e) => patch('linkedin', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nav order (comma-separated IDs)</Label>
              <Input
                value={s.navOrder.join(', ')}
                onChange={(e) =>
                  patch(
                    'navOrder',
                    e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  )
                }
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Skills
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Add or remove items per group. Press Enter to add, or paste a
                comma-separated list and press the + button to bulk-add.
              </p>
            </div>
            <SkillsEditor
              value={s.skills ?? emptySkills()}
              onChange={(next) => patch('skills', next)}
            />
          </div>

          <Separator />

          <CvUploader
            label="CV / Resume"
            hint="PDF only. The public 'Download CV' button appears in the hero, top nav, and /contact page once this is set."
            value={s.cvUrl ?? ''}
            onChange={(url) => patch('cvUrl', url)}
          />

          <Separator />

          <div className="grid gap-2">
            <Label>Spoken languages</Label>
            <Input
              placeholder="Bangla · Native, English · Fluent, Hindi · Conversational"
              value={s.languages.map((l) => `${l.name} · ${l.level}`).join(', ')}
              onChange={(e) =>
                patch(
                  'languages',
                  e.target.value
                    .split(',')
                    .map((entry) => {
                      const [name, level] = entry.split('·').map((x) => x.trim());
                      return { name: name ?? '', level: level ?? '' };
                    })
                    .filter((l) => l.name),
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      <SaveBar
        onSave={async () => {
          const res = await fetch('/api/content/settings', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(s),
          });
          if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.error ?? 'Save failed');
          }
        }}
      />
    </div>
  );
}
