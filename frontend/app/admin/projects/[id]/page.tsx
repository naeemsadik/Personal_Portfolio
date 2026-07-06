import { notFound } from 'next/navigation';
import { getSessionToken } from '@/lib/api/cookie';
import { apiFetch } from '@/lib/api/client';
import { projectToCamel } from '@/lib/api/proxy';
import { projectSchema } from '@/lib/content/schema';
import { ProjectEditor } from '@/components/admin/ProjectEditor';
import type { Project } from '@/lib/content/schema';

type ProjectWithStatus = Project & { status?: 'draft' | 'published' };

export default async function EditProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const token = getSessionToken();
  if (!token) notFound();
  try {
    const raw = await apiFetch<Parameters<typeof projectToCamel>[0]>(
      `/content/projects/${encodeURIComponent(params.id)}`,
      { token },
    );
    const project: ProjectWithStatus = {
      ...projectSchema.parse(projectToCamel(raw)),
      status: (raw as { status?: 'draft' | 'published' }).status ?? 'published',
    };
    return <ProjectEditor mode="edit" initial={project} />;
  } catch {
    notFound();
  }
}
