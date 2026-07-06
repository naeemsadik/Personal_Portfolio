/**
 * /api/analytics
 *
 * POST — public; record a pageview or contact_submit.
 * GET — admin; return the summary rollup.
 */
import { NextResponse } from 'next/server';
import { adminProxy } from '@/lib/api/proxy';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import { analyticsEventSchema } from '@/lib/content/schema';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = analyticsEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  try {
    await apiFetch('/analytics', { body: parsed.data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UpstreamError) {
      const status = err.status === 0 ? 502 : err.status;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return adminProxy({
    method: 'GET',
    path: '/analytics/summary',
    requireAuth: true,
  });
}
