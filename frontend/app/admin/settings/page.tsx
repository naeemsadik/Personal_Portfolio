import { getSettings } from '@/lib/content/read';
import { SettingsAdmin } from './SettingsAdmin';

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return <SettingsAdmin initial={settings} />;
}
