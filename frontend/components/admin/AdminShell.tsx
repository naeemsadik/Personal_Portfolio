'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  User,
  Briefcase,
  FolderGit2,
  Mail,
  BarChart3,
  Settings,
  Newspaper,
  Boxes,
  LogOut,
  Loader2,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { apiSignOut, useApiSession } from '@/components/admin/useApiSession';

const items = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/hero', label: 'Hero', Icon: User },
  { href: '/admin/experience', label: 'Experience', Icon: Briefcase },
  { href: '/admin/projects', label: 'Projects', Icon: FolderGit2 },
  { href: '/admin/blog', label: 'Blog', Icon: Newspaper },
  { href: '/admin/messages', label: 'Messages', Icon: Mail },
  { href: '/admin/analytics', label: 'Analytics', Icon: BarChart3 },
  { href: '/admin/snapshots', label: 'Snapshots', Icon: Boxes },
  { href: '/admin/settings', label: 'Settings', Icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { status, session } = useApiSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (status === 'unauthenticated' && !isLogin) {
      router.replace('/admin/login');
    }
  }, [status, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-accent" />
      </div>
    );
  }
  if (status === 'unauthenticated') return null;

  async function handleSignOut() {
    await apiSignOut();
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-border/60 bg-card/40 backdrop-blur-xl">
        <SidebarHeader className="border-b border-border/60 px-4 py-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/30">
              N
            </span>
            <span>
              Naeem<span className="text-accent">.</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Admin
              </span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ href, label, Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== '/admin' && pathname.startsWith(href));
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={label}
                      >
                        <Link
                          href={href}
                          className={
                            active
                              ? 'bg-accent/10 text-accent'
                              : 'text-muted-foreground hover:text-foreground'
                          }
                        >
                          <Icon className="size-4" />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-border/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">
                {session?.email}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                Signed in
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-accent/40 hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <Skeleton className="hidden h-6 w-40 md:block" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Admin · live
          </div>
        </header>
        <div className="px-4 py-8 md:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
