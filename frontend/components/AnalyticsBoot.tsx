'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SESSION_KEY = 'nas_analytics_session';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity

type Session = { id: string; lastSeen: number };

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (typeof parsed.id !== 'string' || typeof parsed.lastSeen !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(s: Session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // ignore — private mode etc.
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).slice(2) +
    '-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2)
  );
}

function getSession(): string {
  const now = Date.now();
  const existing = readSession();
  if (existing && now - existing.lastSeen < SESSION_TTL_MS) {
    const next: Session = { id: existing.id, lastSeen: now };
    writeSession(next);
    return existing.id;
  }
  const next: Session = { id: uuid(), lastSeen: now };
  writeSession(next);
  return next.id;
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) : s;
}

export function AnalyticsBoot() {
  const pathname = usePathname();
  // Don't track admin views.
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    const send = () =>
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'pageview',
          path: pathname,
          ts: Date.now(),
          user_agent: truncate(navigator.userAgent || '', 255),
          referrer: truncate(document.referrer || '', 255),
          session_id: getSession(),
        }),
        keepalive: true,
      }).catch(() => {
        /* analytics is fire-and-forget */
      });
    // Small delay so the page settles; doesn't block paint.
    const t = setTimeout(send, 250);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}
