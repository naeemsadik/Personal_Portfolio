import { notFound } from 'next/navigation';
import { getSessionToken } from '@/lib/api/cookie';
import { apiFetch } from '@/lib/api/client';
import { experienceToCamel } from '@/lib/api/proxy';
import { experienceSchema } from '@/lib/content/schema';
import { ExperienceEditor } from '@/components/admin/ExperienceEditor';
import type { ExperienceEntry } from '@/lib/content/schema';

type EntryWithStatus = ExperienceEntry & { status?: 'draft' | 'published' };

export default async function EditExperiencePage({
  params,
}: {
  params: { id: string };
}) {
  const token = getSessionToken();
  if (!token) notFound();
  try {
    const raw = await apiFetch<Parameters<typeof experienceToCamel>[0]>(
      `/content/experience/${encodeURIComponent(params.id)}`,
      { token },
    );
    const entry: EntryWithStatus = {
      ...experienceSchema.parse(experienceToCamel(raw)),
      status: (raw as { status?: 'draft' | 'published' }).status ?? 'published',
    };
    return <ExperienceEditor mode="edit" initial={entry} />;
  } catch {
    notFound();
  }
}
