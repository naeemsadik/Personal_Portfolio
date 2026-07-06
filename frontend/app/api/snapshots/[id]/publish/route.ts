/**
 * /api/snapshots/[id]/publish
 *
 * Admin proxy. Atomic publish: demotes the currently-published row to
 * `archived`, marks this row `published`, and updates the live site
 * pointer. Returns the freshly-published snapshot.
 */
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return adminProxy({
    method: 'POST',
    path: `/admin/snapshots/${encodeURIComponent(id)}/publish`,
    requireAuth: true,
  });
}