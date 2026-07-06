/**
 * Server-side HTTP client for the FastAPI backend.
 *
 * Used by:
 *  - `lib/content/read.ts` and `lib/content/blog.ts` (server components)
 *  - `app/api/[...]/route.ts` (thin proxies) -- they forward cookies for auth
 *
 * Behavior:
 *  - `API_INTERNAL_URL` is used first; falls back to `NEXT_PUBLIC_API_URL`,
 *    then `http://localhost:8000`. This lets SSR/proxies talk to a
 *    separate host (e.g. backend on `backend:8000` inside compose) while
 *    the browser still uses the public URL.
 *  - All calls have a short timeout. If the backend is unreachable, we
 *    throw and let the caller fall back to `lib/content/fallback.ts`.
 */
import 'server-only';
import { getApiBaseUrl } from '@/lib/env';

export class UpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type FetchOpts = {
  /** Bearer token to send as Authorization. */
  token?: string | null;
  /** Additional headers to merge in. */
  headers?: Record<string, string>;
  /** Body for write requests. JSON-encoded automatically. */
  body?: unknown;
  /** HTTP method. Defaults to GET (or POST if `body` is set). */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Abort after this many ms. Defaults to 4000. */
  timeoutMs?: number;
  /** Disable the timeout entirely (use sparingly). */
  noTimeout?: boolean;
  /** Query string params. Values are coerced to strings. */
  query?: Record<string, string | number | boolean | undefined | null>;
};

const DEFAULT_TIMEOUT_MS = 4000;

function buildUrl(path: string, query?: FetchOpts['query']): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  const url = new URL(path.startsWith('/') ? path : `/${path}`, base);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOpts = {},
): Promise<T> {
  const { token, headers, body, method, timeoutMs, noTimeout, query } = opts;
  const url = buildUrl(path, query);
  const init: RequestInit = {
    method: method ?? (body !== undefined ? 'POST' : 'GET'),
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  };

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  if (!noTimeout) {
    timer = setTimeout(
      () => controller.abort(),
      timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
  }
  init.signal = controller.signal;

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (timer) clearTimeout(timer);
    throw new UpstreamError(
      `Upstream fetch failed: ${(err as Error).message}`,
      0,
    );
  }
  if (timer) clearTimeout(timer);

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const detail =
      (parsed && typeof parsed === 'object' && 'detail' in parsed
        ? String((parsed as { detail: unknown }).detail)
        : null) ?? res.statusText;
    throw new UpstreamError(`Upstream ${res.status}: ${detail}`, res.status);
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
