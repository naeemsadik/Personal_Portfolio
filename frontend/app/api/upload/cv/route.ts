/**
 * /api/upload/cv — admin only.
 *
 * Accepts a multipart upload of a PDF CV from the admin Settings page,
 * forwards it to FastAPI `POST /uploads?kind=cv`, and returns the same
 * `{url, pathname, kind}` shape the image uploader uses. The PDF is
 * stored at `backend/uploads/cv/{timestamp}-{uuid}-{name}.pdf` and
 * served at `GET /media/cv/{name}`.
 *
 * The frontend settings page stores the returned URL in
 * `settings.cvUrl`, which the public hero / nav / contact page reads
 * to render a "Download CV" button.
 *
 * Contract:
 *   POST multipart/form-data with `file` field (application/pdf, ≤ MAX_CV_UPLOAD_MB).
 *   201 -> { url, pathname, kind: 'cv' }
 *   400 -> { error }
 *   401 -> { error: 'unauthorized' }
 *   413 -> { error: 'File too large' }
 *   415 -> { error: 'CV uploads must be application/pdf' }
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/api/cookie';
import { getApiBaseUrl } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Keep in sync with backend/app/config.py:MAX_CV_UPLOAD_MB.
const MAX_BYTES = 10 * 1024 * 1024;

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
      { error: 'File too large (max 10MB)' },
      { status: 413 },
    );
  }
  // Friendly early reject — the backend also enforces this with 415.
  if (file.type && file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'CV uploads must be application/pdf' },
      { status: 415 },
    );
  }

  // Build a multipart payload for FastAPI.
  const forward = new FormData();
  forward.append('file', file, file.name);

  const url = `${getApiBaseUrl().replace(/\/+$/, '')}/uploads?kind=cv`;
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

  const json = (await res.json()) as {
    url: string;
    pathname: string;
    kind: 'cv' | 'image';
  };
  return NextResponse.json(json, { status: 201 });
}
