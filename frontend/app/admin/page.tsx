import Link from 'next/link';
import {
  Briefcase,
  FolderGit2,
  Mail,
  User,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { listExperience, listMessages, listProjects } from '@/lib/content/read';
import { getSessionToken } from '@/lib/api/cookie';
import { apiFetch, UpstreamError } from '@/lib/api/client';
import {
  EMPTY_ANALYTICS,
  toCamelAnalytics,
  type AnalyticsSummary,
  type RawAnalyticsSummary,
} from '@/lib/api/analytics';
import { formatDate } from '@/lib/cn';

async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const token = getSessionToken();
  if (!token) return EMPTY_ANALYTICS;
  try {
    const raw = await apiFetch<RawAnalyticsSummary>('/analytics/summary', {
      token,
    });
    return toCamelAnalytics(raw);
  } catch (err) {
    if (!(err instanceof UpstreamError)) {
      console.warn('getAnalyticsSummary unexpected error:', err);
    }
    return EMPTY_ANALYTICS;
  }
}

export default async function AdminDashboard() {
  const [experience, projects, messages, analytics] = await Promise.all([
    listExperience(),
    listProjects(),
    listMessages(),
    getAnalyticsSummary(),
  ]);

  const unread = messages.filter((m) => !m.read).length;
  const last7 = analytics.pageviewsLast7Days.reduce(
    (sum, d) => sum + d.count,
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick overview of your portfolio.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Projects" value={projects.length} Icon={FolderGit2} />
        <StatCard label="Experience" value={experience.length} Icon={Briefcase} />
        <StatCard
          label="Messages"
          value={messages.length}
          hint={unread ? `${unread} unread` : 'All read'}
          Icon={Mail}
          accent={unread > 0}
        />
        <StatCard
          label="Pageviews (7d)"
          value={last7}
          hint={`${analytics.totalPageviews} all-time`}
          Icon={BarChart3}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold">Quick actions</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin/hero"><User className="mr-2 size-4 text-accent" /> Edit hero</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin/projects"><FolderGit2 className="mr-2 size-4 text-accent" /> Manage projects</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin/experience"><Briefcase className="mr-2 size-4 text-accent" /> Manage experience</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin/settings"><User className="mr-2 size-4 text-accent" /> Site settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold">Recent messages</div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/messages">View all</Link>
              </Button>
            </div>
            {messages.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                <MessageSquare className="size-4" /> No messages yet.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {messages.slice(0, 4).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {m.name}{' '}
                        <span className="text-muted-foreground">· {m.email}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.message}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(m.receivedAt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
