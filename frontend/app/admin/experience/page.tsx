import { listExperience } from '@/lib/content/read';
import { getSessionToken } from '@/lib/api/cookie';
import { apiFetch } from '@/lib/api/client';
import { experienceToCamel } from '@/lib/api/proxy';
import { experienceSchema } from '@/lib/content/schema';
import { ExperienceListAdmin } from '@/components/admin/ExperienceListAdmin';
import type { ExperienceEntry } from '@/lib/content/schema';

type EntryWithStatus = ExperienceEntry & { status?: 'draft' | 'published' };

export default async function AdminExperiencePage() {
  const token = getSessionToken();
  let entries: EntryWithStatus[] = [];
  if (token) {
    try {
      const raw = await apiFetch<
        Array<Parameters<typeof experienceToCamel>[0]>
      >('/content/experience', { token });
      entries = raw.map((r) => ({
        ...experienceSchema.parse(experienceToCamel(r)),
        status: (r as { status?: 'draft' | 'published' }).status ?? 'published',
      }));
    } catch {
      entries = await listExperience();
    }
  } else {
    entries = await listExperience();
  }
  return <ExperienceListAdmin initial={entries} />;
}
