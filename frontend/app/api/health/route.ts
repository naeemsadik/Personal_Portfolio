/**
 * GET /api/health — liveness probe.
 *
 * Used by the Docker HEALTHCHECK. Returns 200 with the service name
 * regardless of backend state (we don't want the frontend container
 * to be marked unhealthy just because FastAPI is down — Coolify's
 * reverse proxy will surface the backend separately).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok', service: 'frontend' });
}
