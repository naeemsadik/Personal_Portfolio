/**
 * /api/snapshots
 *
 * Admin proxy:
 *   - GET  → list snapshots
 *   - POST → create + start a new snapshot generation
 */
import { adminProxy } from '@/lib/api/proxy';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get('limit') ?? '50';
  const offset = url.searchParams.get('offset') ?? '0';
  return adminProxy({
    method: 'GET',
    path: '/admin/snapshots',
    requireAuth: true,
    query: { limit, offset },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return adminProxy({
    method: 'POST',
    path: '/admin/snapshots',
    body,
    requireAuth: true,
  });
}