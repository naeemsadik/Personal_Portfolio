/**
 * /api/snapshots/[id]/progress
 *
 * Admin proxy. Returns the same payload as /api/snapshots/[id] but is
 * named explicitly for the polling client (1s poll during generation).
 */
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return adminProxy({
    method: 'GET',
    path: `/admin/snapshots/${encodeURIComponent(id)}/progress`,
    requireAuth: true,
  });
}