/**
 * /api/snapshots/[id]/cancel
 *
 * Admin proxy. Tries to stop a `generating` snapshot. The actual
 * cancellation is cooperative — the snapshot loop checks an asyncio
 * Event between pages.
 */
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return adminProxy({
    method: 'POST',
    path: `/admin/snapshots/${encodeURIComponent(id)}/cancel`,
    requireAuth: true,
  });
}