/**
 * Wire-format adapter for the FastAPI `/analytics/summary` endpoint.
 *
 * FastAPI returns snake_case (`pageviews_last_7_days`, `total_pageviews`,
 * `top_paths`, ...). The admin dashboard reads those fields as camelCase
 * throughout, so we translate once here and pass camelCase to the React
 * tree.
 */

export type RecentEvent = {
  id: number;
  type: 'pageview' | 'contact_submit';
  path: string;
  ts: number;
  userAgent: string | null;
  referrer: string | null;
  sessionId: string | null;
};

export type DailyBucket = {
  date: string;
  pageviews: number;
  contact: number;
};

export type AnalyticsSummary = {
  totalEvents: number;
  totalPageviews: number;
  totalContactSubmissions: number;
  contactSubmissionsLast7Days: number;
  pageviewsLast7Days: { date: string; count: number }[];
  topPaths: { path: string; count: number }[];
  // New fields for the upgraded admin dashboard.
  uniqueVisitors30d: number;
  recentEvents: RecentEvent[];
  daily30d: DailyBucket[];
  topPaths30d: { path: string; count: number }[];
};

export type RawAnalyticsSummary = {
  total_events?: number;
  total_pageviews?: number;
  total_contact_submissions?: number;
  contact_submissions_last_7_days?: number;
  pageviews_last_7_days?: { date: string; count: number }[];
  top_paths?: { path: string; count: number }[];
  unique_visitors_30d?: number;
  recent_events?: Array<{
    id: number;
    type: 'pageview' | 'contact_submit';
    path: string;
    ts: number;
    user_agent?: string | null;
    referrer?: string | null;
    session_id?: string | null;
  }>;
  daily_30d?: Array<{ date: string; pageviews: number; contact: number }>;
  top_paths_30d?: Array<{ path: string; count: number }>;
};

export const EMPTY_ANALYTICS: AnalyticsSummary = {
  totalEvents: 0,
  totalPageviews: 0,
  totalContactSubmissions: 0,
  contactSubmissionsLast7Days: 0,
  pageviewsLast7Days: [],
  topPaths: [],
  uniqueVisitors30d: 0,
  recentEvents: [],
  daily30d: [],
  topPaths30d: [],
};

export function toCamelAnalytics(
  raw: RawAnalyticsSummary | null | undefined,
): AnalyticsSummary {
  if (!raw) return EMPTY_ANALYTICS;
  return {
    totalEvents: raw.total_events ?? 0,
    totalPageviews: raw.total_pageviews ?? 0,
    totalContactSubmissions: raw.total_contact_submissions ?? 0,
    contactSubmissionsLast7Days: raw.contact_submissions_last_7_days ?? 0,
    pageviewsLast7Days: raw.pageviews_last_7_days ?? [],
    topPaths: raw.top_paths ?? [],
    uniqueVisitors30d: raw.unique_visitors_30d ?? 0,
    recentEvents: (raw.recent_events ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      path: r.path,
      ts: r.ts,
      userAgent: r.user_agent ?? null,
      referrer: r.referrer ?? null,
      sessionId: r.session_id ?? null,
    })),
    daily30d: (raw.daily_30d ?? []).map((d) => ({
      date: d.date,
      pageviews: d.pageviews,
      contact: d.contact,
    })),
    topPaths30d: raw.top_paths_30d ?? [],
  };
}
