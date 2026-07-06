'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DotArtUploader } from '@/components/admin/DotArtUploader';
import { SaveBar } from '@/components/admin/SaveBar';
import type { HeroContent } from '@/lib/content/schema';

export function HeroEditor({ initial }: { initial: HeroContent }) {
  const [hero, setHero] = useState<HeroContent>(initial);

  function patch<K extends keyof HeroContent>(key: K, value: HeroContent[K]) {
    setHero((h) => ({ ...h, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Hero
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The first thing visitors see. Headline animates word-by-word.
        </p>
      </header>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex flex-col gap-2 p-5 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">
            How the brand-mark works
          </div>
          <p>
            The hero shows a <strong>dot grid</strong> rendered live on a
            canvas. The dots are sourced from a JSON file at{' '}
            <code className="rounded bg-card/60 px-1.5 py-0.5 text-[11px]">
              public/portrait/PictureonNAS.particles.json
            </code>
            . On hover, dots within reach of the pointer are pushed away
            and smoothly return home.
          </p>
          <ul className="ml-5 list-disc space-y-1 text-xs">
            <li>
              <strong>Replace the dots</strong>: upload a new{' '}
              <code className="rounded bg-card/60 px-1.5 py-0.5 text-[11px]">
                .txt
              </code>{' '}
              braille-art file below. The server parses it and overwrites
              the JSON. The hero updates on next visit (no rebuild needed).
            </li>
            <li>
              <strong>Offline workflow</strong>: edit{' '}
              <code className="rounded bg-card/60 px-1.5 py-0.5 text-[11px]">
                dot_art_img.txt
              </code>{' '}
              at the project root, then run{' '}
              <code className="rounded bg-card/60 px-1.5 py-0.5 text-[11px]">
                npm run bake-dot-art
              </code>{' '}
              from <code className="rounded bg-card/60 px-1.5 py-0.5 text-[11px]">frontend/</code>.
            </li>
            <li>
              <strong>No PNG, no image upload</strong>. The text file is the
              only source of truth.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="grid gap-2">
            <Label htmlFor="greeting">Greeting</Label>
            <Input
              id="greeting"
              value={hero.greeting}
              onChange={(e) => patch('greeting', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Headline (each word animates in)</Label>
            <div className="flex flex-wrap gap-2">
              {hero.headline.map((w, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input
                    value={w}
                    onChange={(e) => {
                      const next = [...hero.headline];
                      next[i] = e.target.value;
                      patch('headline', next);
                    }}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      patch(
                        'headline',
                        hero.headline.filter((_, idx) => idx !== i),
                      )
                    }
                    aria-label="Remove word"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => patch('headline', [...hero.headline, 'New'])}
              >
                <Plus data-icon="inline-start" /> Add word
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Textarea
              id="tagline"
              rows={2}
              value={hero.tagline}
              onChange={(e) => patch('tagline', e.target.value)}
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-3 rounded-md border border-border/60 bg-card/30 p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Primary CTA
              </div>
              <Input
                placeholder="Label"
                value={hero.primaryCta.label}
                onChange={(e) =>
                  patch('primaryCta', { ...hero.primaryCta, label: e.target.value })
                }
              />
              <Input
                placeholder="/projects"
                value={hero.primaryCta.href}
                onChange={(e) =>
                  patch('primaryCta', { ...hero.primaryCta, href: e.target.value })
                }
              />
            </div>
            <div className="grid gap-3 rounded-md border border-border/60 bg-card/30 p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Secondary CTA
              </div>
              <Input
                placeholder="Label"
                value={hero.secondaryCta.label}
                onChange={(e) =>
                  patch('secondaryCta', { ...hero.secondaryCta, label: e.target.value })
                }
              />
              <Input
                placeholder="/contact"
                value={hero.secondaryCta.href}
                onChange={(e) =>
                  patch('secondaryCta', { ...hero.secondaryCta, href: e.target.value })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <Label>Social links</Label>
            <div className="flex flex-col gap-2">
              {hero.socials.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="platform (github / linkedin / email)"
                    value={s.platform}
                    onChange={(e) => {
                      const next = [...hero.socials];
                      next[i] = { ...s, platform: e.target.value };
                      patch('socials', next);
                    }}
                    className="w-48"
                  />
                  <Input
                    placeholder="Label (optional)"
                    value={s.label ?? ''}
                    onChange={(e) => {
                      const next = [...hero.socials];
                      next[i] = { ...s, label: e.target.value };
                      patch('socials', next);
                    }}
                    className="w-48"
                  />
                  <Input
                    placeholder="https://…"
                    value={s.url}
                    onChange={(e) => {
                      const next = [...hero.socials];
                      next[i] = { ...s, url: e.target.value };
                      patch('socials', next);
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      patch('socials', hero.socials.filter((_, idx) => idx !== i))
                    }
                    aria-label="Remove social"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  patch('socials', [...hero.socials, { platform: 'github', url: 'https://github.com/your-handle' }])
                }
              >
                <Plus data-icon="inline-start" /> Add social
              </Button>
            </div>
          </div>

          <Separator />

          <DotArtUploader value="/portrait/PictureonNAS.particles.json" />
        </CardContent>
      </Card>

      <SaveBar
        onSave={async () => {
          const res = await fetch('/api/content/hero', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(hero),
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
