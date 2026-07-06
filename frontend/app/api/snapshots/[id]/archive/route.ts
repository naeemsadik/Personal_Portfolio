/**
 * /api/snapshots/[id]/archive
 *
 * Admin proxy. Marks a `generated` snapshot `archived`. Refuses on
 * `published` (use rollback instead) or other non-`generated` statuses.
 */
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return adminProxy({
    method: 'POST',
    path: `/admin/snapshots/${encodeURIComponent(id)}/archive`,
    requireAuth: true,
  });
}