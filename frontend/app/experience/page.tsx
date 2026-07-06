import type { Metadata } from 'next';
import { ExperienceTimeline } from '@/components/sections/ExperienceTimeline';
import { listExperience } from '@/lib/content/read';

export const metadata: Metadata = {
  title: 'Experience',
  description:
    'Education, leadership, volunteering, and project experience of Naeem Abdullah Sadik.',
};

export default async function ExperiencePage() {
  const entries = await listExperience();
  return (
    <div className="pt-12">
      <ExperienceTimeline entries={entries} />
    </div>
  );
}
