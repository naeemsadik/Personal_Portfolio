import { getSessionToken } from '@/lib/api/cookie';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import {
  EMPTY_ANALYTICS,
  toCamelAnalytics,
  type AnalyticsSummary,
  type RawAnalyticsSummary,
} from '@/lib/api/analytics';
import { AnalyticsAdmin } from './AnalyticsAdmin';

async function fetchSummary(): Promise<AnalyticsSummary> {
  const token = getSessionToken();
  if (!token) return EMPTY_ANALYTICS;
  try {
    const raw = await apiFetch<RawAnalyticsSummary>('/analytics/summary', {
      token,
    });
    return toCamelAnalytics(raw);
  } catch (err) {
    if (!(err instanceof UpstreamError)) {
      console.warn('analytics: fetchSummary unexpected error:', err);
    }
    return EMPTY_ANALYTICS;
  }
}

export default async function AdminAnalyticsPage() {
  const summary = await fetchSummary();
  return <AnalyticsAdmin initial={summary} />;
}