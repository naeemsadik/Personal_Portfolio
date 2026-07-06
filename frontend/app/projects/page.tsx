import type { Metadata } from 'next';
import { ProjectsGrid } from '@/components/sections/ProjectsGrid';
import { listProjects } from '@/lib/content/read';
import { creativeWorkJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Projects',
  description:
    'Web apps, full-stack tools, and experiments built by Naeem Abdullah Sadik.',
};

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="pt-12">
      {projects.map((p) => (
        <script
          key={p.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(creativeWorkJsonLd(p)),
          }}
        />
      ))}
      <ProjectsGrid projects={projects} />
    </div>
  );
}
