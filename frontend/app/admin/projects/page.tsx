import { listProjects } from '@/lib/content/read';
import { getSessionToken } from '@/lib/api/cookie';
import { ProjectsListAdmin } from '@/components/admin/ProjectsListAdmin';
import { apiFetch } from '@/lib/api/client';
import { projectToCamel } from '@/lib/api/proxy';
import { projectSchema } from '@/lib/content/schema';

type ProjectWithStatus = ReturnType<typeof projectSchema.parse> & {
  status?: 'draft' | 'published';
};

/**
 * /admin/projects — list of all projects (drafts + published) with edit /
 * publish-toggle / delete actions. The editor itself lives at
 * /admin/projects/new and /admin/projects/[id].
 *
 * Tries the admin endpoint first (which returns drafts) and falls back to
 * the public list if the request doesn't carry the admin cookie (e.g.
 * during a static render).
 */
export default async function AdminProjectsPage() {
  const token = getSessionToken();
  let projects: ProjectWithStatus[] = [];
  if (token) {
    try {
      const raw = await apiFetch<
        Array<Parameters<typeof projectToCamel>[0]>
      >('/content/projects', { token });
      projects = raw.map((r) => ({
        ...projectSchema.parse(projectToCamel(r)),
        status: (r as { status?: 'draft' | 'published' }).status ?? 'published',
      }));
    } catch {
      projects = await listProjects();
    }
  } else {
    projects = await listProjects();
  }
  return <ProjectsListAdmin initial={projects} />;
}
