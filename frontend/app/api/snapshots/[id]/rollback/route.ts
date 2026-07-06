/**
 * /api/snapshots/[id]/rollback
 *
 * Admin proxy. Same behavior as publish — used when restoring an
 * older `archived` snapshot. The "rollback" name signals intent to
 * the admin UI ("go back to this version").
 */
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return adminProxy({
    method: 'POST',
    path: `/admin/snapshots/${encodeURIComponent(id)}/rollback`,
    requireAuth: true,
  });
}