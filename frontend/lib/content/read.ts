import 'server-only';
import { unstable_cache as cache } from 'next/cache';
import {
  type ExperienceEntry,
  experienceSchema,
  type HeroContent,
  heroSchema,
  type Project,
  projectSchema,
  type SettingsContent,
  settingsSchema,
  type StoredMessage,
  storedMessageSchema,
} from '@/lib/content/schema';
import {
  fallbackExperience,
  fallbackHero,
  fallbackProjects,
  fallbackSettings,
} from '@/lib/content/fallback';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import { getSessionToken } from '@/lib/api/cookie';

export const revalidate = 60; // seconds — also invalidated via revalidatePath on writes

// During `next build`, the FastAPI host isn't reachable. Skip network calls
// and return safe defaults so static generation succeeds. Runtime requests
// fall back to the same defaults whenever FastAPI is unreachable or returns
// a non-OK status, so the public site never renders blank sections.
const isBuildPhase = () => process.env.NEXT_PHASE === 'phase-production-build';

// ---- Wire-format helpers ----------------------------------------------
// The FastAPI backend emits snake_case keys (cover_url, reading_time_min,
// ord, published_at, etc). The frontend Zod schema uses camelCase. The
// mappers below translate one direction so the rest of the frontend can
// stay typed against camelCase.

type RawBlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  tags: string[];
  status: 'draft' | 'published';
  reading_time_min: number;
  ord: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapBlogPost(raw: RawBlogPost) {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt,
    body: raw.body,
    coverUrl: raw.cover_url,
    tags: raw.tags ?? [],
    status: raw.status,
    readingTimeMin: raw.reading_time_min,
    order: raw.ord,
    publishedAt: raw.published_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

// ---- Reads -------------------------------------------------------------

export const getHero = cache(async (): Promise<HeroContent> => {
  if (isBuildPhase()) return fallbackHero;
  try {
    const data = await apiFetch<HeroContent>('/content/hero');
    return heroSchema.parse(data);
  } catch (err) {
    if (!(err instanceof UpstreamError)) {
      console.warn('getHero unexpected error:', err);
    }
    return fallbackHero;
  }
}, ['hero'], { revalidate });

export const getSettings = cache(async (): Promise<SettingsContent> => {
  if (isBuildPhase()) return fallbackSettings;
  try {
    const data = await apiFetch<SettingsContent>('/content/settings');
    return settingsSchema.parse(data);
  } catch (err) {
    if (!(err instanceof UpstreamError)) {
      console.warn('getSettings unexpected error:', err);
    }
    return fallbackSettings;
  }
}, ['settings'], { revalidate });

export async function listExperience(): Promise<ExperienceEntry[]> {
  if (isBuildPhase()) return [...fallbackExperience];
  try {
    const data = await apiFetch<ExperienceEntry[]>('/content/experience');
    if (!data || data.length === 0) return [...fallbackExperience];
    return data.map((d) => experienceSchema.parse(d));
  } catch (err) {
    if (!(err instanceof UpstreamError)) {
      console.warn('listExperience unexpected error:', err);
    }
    return [...fallbackExperience];
  }
}

export async function listProjects(): Promise<Project[]> {
  if (isBuildPhase()) return [...fallbackProjects];
  try {
    const data = await apiFetch<Project[]>('/content/projects');
    if (!data || data.length === 0) return [...fallbackProjects];
    return data.map((p) => projectSchema.parse(p));
  } catch (err) {
    if (!(err instanceof UpstreamError)) {
      console.warn('listProjects unexpected error:', err);
    }
    return [...fallbackProjects];
  }
}

export async function listMessages(): Promise<StoredMessage[]> {
  if (isBuildPhase()) return [];
  // Forward the admin session token to FastAPI's admin-only GET /messages.
  // Calling FastAPI directly from a server component doesn't carry the user's
  // session cookie; reading it via cookies() and passing it as a Bearer is
  // the simplest way to authenticate the call without an extra round-trip
  // through the Next.js /api proxy.
  try {
    const token = getSessionToken();
    // FastAPI emits snake_case; map to camelCase for the Zod schema.
    const data = await apiFetch<
      Array<{
        id: number;
        name: string;
        email: string;
        message: string;
        received_at: string;
        is_read: boolean;
      }>
    >('/messages', { token, noTimeout: true });
    if (!data) return [];
    return data.map((r) =>
      storedMessageSchema.parse({
        id: String(r.id),
        name: r.name,
        email: r.email,
        message: r.message,
        receivedAt: r.received_at,
        read: r.is_read,
      }),
    );
  } catch (err) {
    if (!(err instanceof UpstreamError)) {
      console.warn('listMessages unexpected error:', err);
    }
    return [];
  }
}

export async function getExperience(
  id: string,
): Promise<ExperienceEntry | null> {
  if (isBuildPhase())
    return fallbackExperience.find((e) => e.id === id) ?? null;
  try {
    const data = await apiFetch<ExperienceEntry>(`/content/experience/${id}`);
    return experienceSchema.parse(data);
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 404) {
      return fallbackExperience.find((e) => e.id === id) ?? null;
    }
    if (!(err instanceof UpstreamError)) {
      console.warn('getExperience unexpected error:', err);
    }
    return fallbackExperience.find((e) => e.id === id) ?? null;
  }
}

export async function getProject(id: string): Promise<Project | null> {
  if (isBuildPhase())
    return fallbackProjects.find((p) => p.id === id) ?? null;
  try {
    const data = await apiFetch<Project>(`/content/projects/${id}`);
    return projectSchema.parse(data);
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 404) {
      return fallbackProjects.find((p) => p.id === id) ?? null;
    }
    if (!(err instanceof UpstreamError)) {
      console.warn('getProject unexpected error:', err);
    }
    return fallbackProjects.find((p) => p.id === id) ?? null;
  }
}

// Re-export the blog mapper so `lib/content/blog.ts` can use the same
// raw type if it wants to.
export { mapBlogPost };
export type { RawBlogPost };
