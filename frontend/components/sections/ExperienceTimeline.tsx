'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Award, Briefcase, GraduationCap, HeartHandshake, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/cn';
import type { ExperienceEntry } from '@/lib/content/schema';

const kindMeta: Record<
  ExperienceEntry['kind'],
  { Icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  work: { Icon: Briefcase, label: 'Work' },
  education: { Icon: GraduationCap, label: 'Education' },
  leadership: { Icon: Users, label: 'Leadership' },
  volunteer: { Icon: HeartHandshake, label: 'Volunteer' },
  achievement: { Icon: Award, label: 'Achievement' },
};

type Props = {
  entries: ExperienceEntry[];
  compact?: boolean;
};

export function ExperienceTimeline({ entries, compact }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  if (entries.length === 0) return null;

  return (
    <section
      ref={ref}
      id="experience"
      className="relative py-24 md:py-32"
    >
      <div className="container">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-accent/80">
            Experience
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Where I've been, what I've built.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Education, leadership, volunteering, and projects — a snapshot of my
            journey so far.
          </p>
        </header>

        <ol className="relative mt-16">
          {/* Center line */}
          <span
            aria-hidden
            className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-accent/50 via-border to-transparent md:left-1/2 md:-translate-x-px"
          />

          {entries.map((entry, i) => {
            const { Icon, label } = kindMeta[entry.kind];
            const side = i % 2 === 0 ? 'left' : 'right';
            return (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: 0.05 * i,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={
                  'relative mb-10 md:grid md:grid-cols-2 md:items-center md:gap-12 ' +
                  (compact && i > 1 ? 'md:mb-8' : '')
                }
              >
                {/* Dot */}
                <span
                  aria-hidden
                  className="absolute left-4 top-4 grid size-3 -translate-x-1/2 place-items-center rounded-full bg-background ring-2 ring-accent md:left-1/2"
                />

                <div
                  className={
                    'pl-12 md:pl-0 ' +
                    (side === 'left'
                      ? 'md:col-start-1 md:pr-8 md:text-right'
                      : 'md:col-start-2 md:pl-8')
                  }
                >
                  <Card className="border-border/60 bg-card/60 backdrop-blur-sm transition-colors hover:border-accent/40">
                    <CardContent className="flex flex-col gap-3 p-5">
                      <div
                        className={
                          'flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground ' +
                          (side === 'left' ? 'md:justify-end' : '')
                        }
                      >
                        <Icon className="size-3.5 text-accent" />
                        <span>{label}</span>
                        <span aria-hidden>·</span>
                        <span>
                          {formatDate(entry.startDate)} —{' '}
                          {entry.endDate ? formatDate(entry.endDate) : 'Present'}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {entry.title}
                      </h3>
                      <div
                        className={
                          'text-sm text-muted-foreground ' +
                          (side === 'left' ? 'md:text-right' : '')
                        }
                      >
                        {entry.organization}
                        {entry.location ? ` · ${entry.location}` : ''}
                      </div>
                      {entry.meta && (
                        <div className="text-xs font-medium text-accent">
                          {entry.meta}
                        </div>
                      )}
                      <p
                        className={
                          'text-sm leading-relaxed text-muted-foreground ' +
                          (side === 'left' ? 'md:text-right' : '')
                        }
                      >
                        {entry.description}
                      </p>
                      {entry.tags.length > 0 && (
                        <div
                          className={
                            'flex flex-wrap gap-1.5 ' +
                            (side === 'left' ? 'md:justify-end' : '')
                          }
                        >
                          {entry.tags.map((t) => (
                            <Badge key={t} variant="secondary" className="rounded-full text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
