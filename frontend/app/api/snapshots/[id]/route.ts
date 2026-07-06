/**
 * /api/snapshots/[id]
 *
 * Admin proxy:
 *   - GET    → snapshot detail (camelCase via the upstream Pydantic
 *              model, no extra translation needed)
 *   - DELETE → remove a snapshot (refuses on `published`)
 */
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return adminProxy({
    method: 'GET',
    path: `/admin/snapshots/${encodeURIComponent(id)}`,
    requireAuth: true,
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return adminProxy({
    method: 'DELETE',
    path: `/admin/snapshots/${encodeURIComponent(id)}`,
    requireAuth: true,
  });
}