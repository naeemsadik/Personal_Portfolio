'use client';

import type { ReactNode } from 'react';

/**
 * Top-level client providers wrapper.
 *
 * The portfolio no longer uses NextAuth; the admin session is read via
 * `useApiSession` which calls `/api/auth/me`. So this component is now a
 * passthrough, but keeping it as a separate file means we can drop in
 * context providers (theme, toast, etc.) here without touching `layout.tsx`.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}