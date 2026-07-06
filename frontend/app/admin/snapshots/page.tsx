import { SnapshotsAdmin } from '@/components/admin/SnapshotsAdmin';

/**
 * /admin/snapshots — Snapshot Manager.
 *
 * Phase 1 ships the Overview card (current live snapshot + Enable/Disable
 * toggle). Phase 2 adds the Generate tab and the history table. The page
 * is a thin server wrapper that renders the client component; data
 * fetching happens client-side via the `/api/site-state` and
 * `/api/snapshots/*` proxies.
 */
export default function SnapshotsPage() {
  return <SnapshotsAdmin />;
}