'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ExternalLink, Github, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/content/schema';

type Props = {
  projects: Project[];
  featuredOnly?: boolean;
};

export function ProjectsGrid({ projects, featuredOnly }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const list = featuredOnly ? projects.filter((p) => p.featured) : projects;
  if (list.length === 0) return null;

  return (
    <section ref={ref} id="projects" className="py-24 md:py-32">
      <div className="container">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-accent/80">
            Projects
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Selected work.
          </h2>
          <p className="mt-4 text-muted-foreground">
            A few things I've built recently — web apps, full-stack tools, and
            experiments.
          </p>
        </header>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {list.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 0.05 * i,
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <ProjectCard project={p} />
            </motion.div>
          ))}
        </div>

        {featuredOnly && projects.length > list.length && (
          <div className="mt-12 text-center">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/projects">See all projects</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="group relative h-full overflow-hidden border-border/60 bg-card/40 transition-all hover:border-accent/40 hover:bg-card/70">
      <CardContent className="flex flex-col gap-4 p-0">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-2">
          {project.coverUrl ? (
            <Image
              src={project.coverUrl}
              alt={project.title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground/40">
              <span className="font-display text-2xl">{project.title[0]}</span>
            </div>
          )}
          {project.featured && (
            <Badge className="absolute left-3 top-3 rounded-full bg-accent/90 text-accent-foreground">
              <Star data-icon="inline-start" /> Featured
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-xl font-semibold text-foreground">
              {project.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-accent/40 hover:text-foreground"
                  aria-label={`Open ${project.title} live`}
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-accent/40 hover:text-foreground"
                  aria-label={`Open ${project.title} repository`}
                >
                  <Github className="size-4" />
                </a>
              )}
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {project.summary}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {project.tech.map((t) => (
              <Badge key={t} variant="secondary" className="rounded-full text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
