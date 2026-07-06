import { z } from 'zod';

const serverSchema = z.object({
  // Backend connection (server-side fetch base; falls back to public when unset)
  API_INTERNAL_URL: z.string().url().optional(),
  // Optional: contact-form email notifications
  RESEND_API_KEY: z.string().optional(),
  CONTACT_NOTIFY_TO: z.string().email().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type ServerEnv = z.infer<typeof serverSchema>;

const PLACEHOLDER: ServerEnv = {
  NODE_ENV: 'production',
};

let cached: ServerEnv | null = null;

function isBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (parsed.success) {
    cached = parsed.data;
    return cached;
  }
  // During `next build` (prerender phase) we don't need runtime secrets.
  // Return placeholders so static generation completes. Runtime requests
  // hit `assertServerEnv()` which throws if env is malformed.
  if (isBuildPhase()) {
    cached = { ...PLACEHOLDER };
    return cached;
  }
  throw new Error(
    'Invalid environment variables: ' +
      JSON.stringify(parsed.error.flatten().fieldErrors),
  );
}

/** Throw if we're missing required env. Call from runtime handlers. */
export function assertServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      'Invalid environment variables: ' +
        JSON.stringify(parsed.error.flatten().fieldErrors),
    );
  }
  return parsed.data;
}

export function getApiBaseUrl(): string {
  // Server-side fetch base. If unset, use the public URL (works when both run on the same host).
  return (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  );
}

export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}