import type { Metadata } from 'next';
import { ContactSection } from '@/components/sections/ContactSection';
import { getSettings } from '@/lib/content/read';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Naeem Abdullah Sadik.',
};

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <div className="pt-12">
      <ContactSection cvUrl={settings.cvUrl} />
    </div>
  );
}
