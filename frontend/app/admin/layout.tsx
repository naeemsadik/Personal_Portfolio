import { AdminShell } from '@/components/admin/AdminShell';
import { SnapshotPreviewBanner } from '@/components/admin/SnapshotPreviewBanner';
import { Toaster } from '@/components/ui/toaster';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SnapshotPreviewBanner />
      <AdminShell>{children}</AdminShell>
      <Toaster />
    </>
  );
}
