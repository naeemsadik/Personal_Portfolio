'use client';

/**
 * Sticky-top banner shown when the admin is browsing a snapshot via the
 * `?snapshot=vN` query param. The middleware sets a non-httpOnly cookie
 * (`nas_snapshot_preview`) on the rewrite; this component reads it.
 */
import { useEffect, useState } from 'react';
import { Eye, X } from 'lucide-react';

function readPreviewCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)nas_snapshot_preview=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function SnapshotPreviewBanner() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    setVersion(readPreviewCookie());
    // Re-read on every navigation so it updates as the user clicks
    // links that change the query param.
    const onVis = () => setVersion(readPreviewCookie());
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (!version) return null;

  function exit() {
    // Strip the ?snapshot=vN query param and reload.
    const url = new URL(window.location.href);
    url.searchParams.delete('snapshot');
    // Remove the cookie by setting it expired.
    document.cookie = 'nas_snapshot_preview=; Path=/; Max-Age=0';
    window.location.href = url.toString();
  }

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm backdrop-blur-md">
      <div className="flex items-center gap-2 text-amber-100">
        <Eye className="size-4" />
        <span>
          <strong className="font-semibold">Preview mode</strong> — viewing
          snapshot <code className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs">{version}</code>
        </span>
      </div>
      <button
        type="button"
        onClick={exit}
        className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2.5 py-0.5 text-xs text-amber-100 transition hover:border-amber-300 hover:bg-amber-500/20"
      >
        <X className="size-3" /> Exit preview
      </button>
    </div>
  );
}