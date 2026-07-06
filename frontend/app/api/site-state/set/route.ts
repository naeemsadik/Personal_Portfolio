/**
 * /api/site-state/set
 *
 * Admin proxy to FastAPI `POST /admin/site-state`. Used by the
 * "Enable / Disable snapshot mode" toggle on the Snapshot Manager
 * admin page. Phase 1 ships only the toggle; Phase 3 adds the
 * publish/rollback flows that go through other endpoints.
 */
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { mode?: 'off' | 'published'; version?: string }
    | null;
  if (!body || (body.mode !== 'off' && body.mode !== 'published')) {
    return Response.json(
      { error: 'Invalid body. Expected { mode: "off" | "published", version?: string }' },
      { status: 400 },
    );
  }
  return adminProxy({
    method: 'POST',
    path: '/admin/site-state',
    body,
    requireAuth: true,
  });
}