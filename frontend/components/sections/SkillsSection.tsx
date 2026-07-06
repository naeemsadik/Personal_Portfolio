'use client';

import { Badge } from '@/components/ui/badge';
import type { SettingsContent } from '@/lib/content/schema';

type Group = { key: string; label: string; items: string[] };

type Props = {
  settings: SettingsContent;
};

/**
 * Skills section.
 *
 * Reads `settings.skills` (already editable in the admin panel) and renders
 * each non-empty group as a labelled column. Groups:
 *   - languages     (e.g. JavaScript, TypeScript, PHP)
 *   - frontend      (React.js, Next.js)
 *   - backend       (FastAPI, Laravel, MySQL, Redis, ...)
 *   - infrastructure(Docker, Kubernetes / K3s)
 *   - tools         (Figma, Git, ...)
 *   - frameworks    (legacy alias used by older seeded data)
 *
 * Hidden groups are skipped automatically so the section adapts to whatever
 * the admin filled in.
 */
export function SkillsSection({ settings }: Props) {
  const skills = settings.skills;

  const groups: Group[] = [
    { key: 'languages', label: 'Languages', items: skills?.languages ?? [] },
    { key: 'frontend', label: 'Frontend', items: skills?.frontend ?? [] },
    { key: 'backend', label: 'Backend', items: skills?.backend ?? [] },
    { key: 'infrastructure', label: 'Infrastructure', items: skills?.infrastructure ?? [] },
    { key: 'tools', label: 'Tools', items: skills?.tools ?? [] },
    { key: 'frameworks', label: 'Frameworks', items: skills?.frameworks ?? [] },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <section id="skills" className="py-24 md:py-32">
      <div className="container">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-accent/80">
            Skills
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            What I work with.
          </h2>
          <p className="mt-4 text-muted-foreground">
            A snapshot of the technologies, frameworks, and tools I work with
            day to day.
          </p>
        </header>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.key}
              className="rounded-xl border border-border/60 bg-card/40 p-6"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {g.label}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {g.items.length} {g.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {g.items.map((item) => (
                  <li key={item}>
                    <Badge
                      variant="secondary"
                      className="rounded-full text-[11px] font-normal"
                    >
                      {item}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
