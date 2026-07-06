'use client';

import { useEffect, useState } from 'react';

export type ApiSession = {
  email: string;
  role: 'admin' | string;
};

export type ApiSessionState =
  | { status: 'loading'; session: null }
  | { status: 'authenticated'; session: ApiSession }
  | { status: 'unauthenticated'; session: null };

/**
 * Tracks the admin session by polling `/api/auth/me`.
 *
 * Replaces the old `useSession()` from next-auth. The actual session
 * state lives in an httpOnly cookie (`nas_token`) set by `/api/auth/login`.
 * We can't read that cookie from JS, so we ask the server route to tell
 * us whether we're authenticated.
 *
 *   - `loading`     — request in flight
 *   - `authenticated` — server returned `{email, role}`
 *   - `unauthenticated` — server returned 401
 */
export function useApiSession(): ApiSessionState {
  const [state, setState] = useState<ApiSessionState>({
    status: 'loading',
    session: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as ApiSession;
          setState({ status: 'authenticated', session: data });
        } else {
          setState({ status: 'unauthenticated', session: null });
        }
      } catch {
        if (!cancelled) setState({ status: 'unauthenticated', session: null });
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export async function apiSignOut(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}
