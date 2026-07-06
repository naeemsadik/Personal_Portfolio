import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Hero } from '@/components/sections/Hero';
import { ExperienceTimeline } from '@/components/sections/ExperienceTimeline';
import { SkillsSection } from '@/components/sections/SkillsSection';
import { ProjectsGrid } from '@/components/sections/ProjectsGrid';
import { BlogList } from '@/components/sections/BlogList';
import { ContactSection } from '@/components/sections/ContactSection';
import { getHero, getSettings, listExperience, listProjects } from '@/lib/content/read';
import { getLatestPosts } from '@/lib/content/blog';
import { personJsonLd } from '@/lib/seo';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const [hero, settings, experience, projects, latestPosts] = await Promise.all([
    getHero(),
    getSettings(),
    listExperience(),
    listProjects(),
    getLatestPosts(3),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd(settings)) }}
      />
      <Hero hero={hero} settings={settings} />
      <ExperienceTimeline entries={experience.slice(0, 3)} compact />
      <SkillsSection settings={settings} />
      <ProjectsGrid projects={projects} featuredOnly />
      {latestPosts.length > 0 ? (
        <section className="relative py-24 md:py-32">
          <div className="container flex flex-col gap-10">
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-accent/80">
                  Latest from the blog
                </p>
                <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
                  Notes from the build.
                </h2>
              </div>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/blog">
                  All posts
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </header>
            <BlogList posts={latestPosts} />
          </div>
        </section>
      ) : null}
      <ContactSection cvUrl={settings.cvUrl} />
    </>
  );
}
