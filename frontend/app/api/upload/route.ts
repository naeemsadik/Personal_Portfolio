/**
 * /api/upload — admin only.
 *
 * Accepts a multipart upload from the existing `ImageUploader` and
 * forwards it to FastAPI `/uploads`. The response contract is the same
 * as the legacy Firebase version: `{url, pathname}`.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/api/cookie';
import { getApiBaseUrl } from '@/lib/env';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File too large (max 8MB)' },
      { status: 413 },
    );
  }

  // Build a multipart payload for FastAPI.
  const forward = new FormData();
  forward.append('file', file, file.name);

  const url = `${getApiBaseUrl().replace(/\/+$/, '')}/uploads`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: forward,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'upload failed' },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && 'detail' in parsed) {
        detail = String((parsed as { detail: unknown }).detail);
      }
    } catch {
      // keep text
    }
    return NextResponse.json(
      { error: detail || `upload failed: ${res.status}` },
      { status: res.status === 401 ? 401 : 502 },
    );
  }

  const json = (await res.json()) as { url: string; pathname: string };
  return NextResponse.json(json);
}
