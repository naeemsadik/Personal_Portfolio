/**
 * Helpers used by the Next.js `/api/*` proxy route handlers.
 *
 * Each handler is a thin wrapper around FastAPI:
 *   - reads the httpOnly `nas_token` cookie and forwards it as a Bearer
 *     token for admin-gated endpoints;
 *   - delegates the actual read/write to FastAPI via `apiFetch`;
 *   - translates FastAPI's snake_case fields to the camelCase the rest of
 *     the frontend uses (so admin client code stays untouched);
 *   - converts non-2xx responses back to a JSON error with the right code.
 *
 * The proxy does **no** business logic of its own. It exists only to
 * keep the FastAPI host name off the public internet and to keep the
 * admin client's existing fetch calls (which still hit `/api/...`)
 * working unchanged.
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { apiFetch, UpstreamError, type FetchOpts } from '@/lib/api/client';
import { getSessionToken } from '@/lib/api/cookie';

export type AdminMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AdminProxyOptions = {
  method: AdminMethod;
  /** FastAPI path, e.g. `/content/experience`. */
  path: string;
  /** Request body to forward. JSON-stringified automatically. */
  body?: unknown;
  /** Additional query params. */
  query?: FetchOpts['query'];
  /** Whether this endpoint requires the admin session. */
  requireAuth?: boolean;
  /**
   * Translate the FastAPI response (snake_case) into the shape the admin
   * client expects (camelCase). Optional — hero/settings are full-dict
   * passthroughs and don't need translation.
   */
  translate?: (raw: unknown) => unknown;
  /**
   * Translate the request body (camelCase → snake_case) before it leaves
   * the proxy. Same translate function is often used for both directions.
   */
  translateRequest?: (body: unknown) => unknown;
};

export async function adminProxy(opts: AdminProxyOptions): Promise<NextResponse> {
  const token = getSessionToken();
  if (opts.requireAuth && !token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const fetchOpts: FetchOpts = {
    method: opts.method,
    token: token ?? undefined,
  };
  if (opts.body !== undefined) {
    fetchOpts.body = opts.translateRequest
      ? opts.translateRequest(opts.body)
      : opts.body;
  }
  if (opts.query) {
    fetchOpts.query = opts.query;
  }

  try {
    const data = await apiFetch<unknown>(opts.path, fetchOpts);
    const translated = opts.translate ? opts.translate(data) : data;
    return NextResponse.json(translated);
  } catch (err) {
    if (err instanceof UpstreamError) {
      const status = err.status === 0 ? 502 : err.status;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'proxy error' },
      { status: 500 },
    );
  }
}

// ---- Field-name mappers -----------------------------------------------
// These keep the admin client's existing call sites untouched (they still
// pass camelCase). FastAPI's Pydantic models and the `_to_dict` helpers
// emit snake_case for some resources and camelCase for others; the
// mappers below are a single source of truth for the translation.

type RawExperience = {
  id: string;
  kind: string;
  title: string;
  organization: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string;
  tags: string[];
  meta: string | null;
  order: number;
};

export function experienceToCamel(raw: RawExperience) {
  return {
    id: raw.id,
    kind: raw.kind,
    title: raw.title,
    organization: raw.organization,
    location: raw.location ?? '',
    startDate: raw.startDate,
    endDate: raw.endDate,
    description: raw.description,
    tags: raw.tags ?? [],
    meta: raw.meta ?? '',
    order: raw.order,
  };
}

type CamelExperience = {
  id: string;
  kind: string;
  title: string;
  organization: string;
  location?: string | null;
  startDate: string;
  endDate: string | null;
  description: string;
  tags: string[];
  meta?: string | null;
  order: number;
};

export function experienceToSnake(body: CamelExperience) {
  return {
    id: body.id,
    kind: body.kind,
    title: body.title,
    organization: body.organization,
    location: body.location ?? null,
    start_date: body.startDate,
    end_date: body.endDate,
    description: body.description,
    tags: body.tags ?? [],
    meta: body.meta ?? null,
    ord: body.order,
  };
}

type RawProject = {
  id: string;
  title: string;
  summary: string;
  description: string;
  tech: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  coverUrl: string | null;
  featured: boolean;
  order: number;
};

export function projectToCamel(raw: RawProject) {
  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary,
    description: raw.description,
    tech: raw.tech ?? [],
    liveUrl: raw.liveUrl ?? '',
    repoUrl: raw.repoUrl ?? '',
    coverUrl: raw.coverUrl ?? '',
    featured: raw.featured,
    order: raw.order,
  };
}

type CamelProject = {
  id: string;
  title: string;
  summary: string;
  description: string;
  tech: string[];
  liveUrl?: string | null;
  repoUrl?: string | null;
  coverUrl?: string | null;
  featured: boolean;
  order: number;
};

export function projectToSnake(body: CamelProject) {
  return {
    id: body.id,
    title: body.title,
    summary: body.summary,
    description: body.description,
    tech: body.tech ?? [],
    live_url: body.liveUrl ?? null,
    repo_url: body.repoUrl ?? null,
    cover_url: body.coverUrl ?? null,
    featured: body.featured,
    ord: body.order,
  };
}

type RawMessage = {
  id: number;
  name: string;
  email: string;
  message: string;
  received_at: string;
  is_read: boolean;
};

export function messageToCamel(raw: RawMessage) {
  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    message: raw.message,
    receivedAt: raw.received_at,
    read: raw.is_read,
  };
}
