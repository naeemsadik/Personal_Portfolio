'use client';

import { useMemo } from 'react';
import {
  BarChart3,
  Eye,
  MessageSquare,
  TrendingUp,
  Users,
  Globe2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/admin/StatCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AnalyticsSummary } from '@/lib/api/analytics';

function formatTs(ts: number) {
  const d = new Date(ts);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

function truncate(s: string | null | undefined, max = 50) {
  if (!s) return '—';
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export function AnalyticsAdmin({ initial }: { initial: AnalyticsSummary }) {
  const totalPageviews30d = useMemo(
    () => initial.daily30d.reduce((s, d) => s + d.pageviews, 0),
    [initial.daily30d],
  );
  const totalContact30d = useMemo(
    () => initial.daily30d.reduce((s, d) => s + d.contact, 0),
    [initial.daily30d],
  );
  const topPath = initial.topPaths30d[0];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Privacy-friendly event tracking — IP is hashed server-side, no
          third-party trackers.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Pageviews (30d)"
          value={totalPageviews30d}
          Icon={Eye}
        />
        <StatCard
          label="Unique visitors (30d)"
          value={initial.uniqueVisitors30d}
          Icon={Users}
        />
        <StatCard
          label="Contact submits (30d)"
          value={totalContact30d}
          Icon={MessageSquare}
          accent={totalContact30d > 0}
        />
        <StatCard
          label="Top page"
          value={topPath ? topPath.path : '—'}
          Icon={Globe2}
        />
      </section>

      <section className="grid grid-cols-1 gap-4">
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold">
                Pageviews vs Contact — last 30 days
              </div>
              <div className="text-xs text-muted-foreground">
                {initial.daily30d.length} days
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <BarChart data={initial.daily30d}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(5)}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
                  />
                  <Bar
                    dataKey="pageviews"
                    name="Pageviews"
                    fill="hsl(var(--accent))"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="contact"
                    name="Contact submits"
                    fill="hsl(var(--accent) / 0.4)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="font-display text-lg font-semibold">Top paths (30d)</div>
            {initial.topPaths30d.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
                No traffic yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initial.topPaths30d.map((p, i) => {
                    const max = initial.topPaths30d[0]?.count ?? 1;
                    const width = Math.max(2, Math.round((p.count / max) * 100));
                    return (
                      <TableRow key={p.path}>
                        <TableCell className="text-xs text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.path}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {p.count}
                        </TableCell>
                        <TableCell>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
                            <div
                              className="h-full rounded-full bg-accent/70"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold">Recent events</div>
              <div className="text-xs text-muted-foreground">Last 50</div>
            </div>
            {initial.recentEvents.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
                No events recorded yet.
              </div>
            ) : (
              <div className="max-h-[480px] overflow-y-auto rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead className="hidden md:table-cell">UA</TableHead>
                      <TableHead className="hidden lg:table-cell">Referrer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initial.recentEvents
                      .slice()
                      .sort((a, b) => b.ts - a.ts)
                      .map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                            {formatTs(e.ts)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                e.type === 'pageview' ? 'secondary' : 'default'
                              }
                              className="text-[10px]"
                            >
                              {e.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate font-mono text-[11px]">
                            {e.path}
                          </TableCell>
                          <TableCell className="hidden max-w-[200px] truncate text-[11px] text-muted-foreground md:table-cell">
                            {truncate(e.userAgent, 40)}
                          </TableCell>
                          <TableCell className="hidden max-w-[200px] truncate text-[11px] text-muted-foreground lg:table-cell">
                            {truncate(e.referrer, 40)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Pageviews (7d)"
          value={initial.pageviewsLast7Days.reduce((s, d) => s + d.count, 0)}
          Icon={TrendingUp}
        />
        <StatCard
          label="Contact (7d)"
          value={initial.contactSubmissionsLast7Days}
          Icon={MessageSquare}
          accent={initial.contactSubmissionsLast7Days > 0}
        />
        <StatCard
          label="Total events tracked"
          value={initial.totalEvents}
          Icon={BarChart3}
        />
      </section>
    </div>
  );
}
