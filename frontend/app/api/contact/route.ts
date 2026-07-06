/**
 * POST /api/contact — public; saves the message and fires analytics.
 *
 * The actual message is posted to FastAPI `/messages` (no auth needed).
 * After the message is stored we record a `contact_submit` analytics
 * event. If `RESEND_API_KEY` and `CONTACT_NOTIFY_TO` are set we also
 * email the site owner via Resend.
 */
import { NextResponse } from 'next/server';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import { contactMessageSchema } from '@/lib/content/schema';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  let storedId: number | string | undefined;
  try {
    const result = await apiFetch<{ id: number }>('/messages', {
      body: parsed.data,
    });
    storedId = result?.id;
  } catch (err) {
    if (err instanceof UpstreamError) {
      const status = err.status === 0 ? 502 : err.status;
      return NextResponse.json(
        { error: err.message || 'Failed to save message' },
        { status },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save message' },
      { status: 500 },
    );
  }

  // Fire-and-forget analytics.
  void apiFetch('/analytics', {
    body: { type: 'contact_submit', path: '/contact', ts: Date.now() },
  }).catch(() => {
    // swallow — analytics is best-effort
  });

  // Optional Resend notification (server-side only).
  if (process.env.RESEND_API_KEY && process.env.CONTACT_NOTIFY_TO) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Portfolio <noreply@portfolio.local>',
          to: [process.env.CONTACT_NOTIFY_TO],
          subject: `New message from ${parsed.data.name}`,
          text: `From: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
        }),
      });
    } catch (err) {
      console.warn('contact: Resend notification failed', err);
    }
  }

  return NextResponse.json({ ok: true, id: storedId });
}
