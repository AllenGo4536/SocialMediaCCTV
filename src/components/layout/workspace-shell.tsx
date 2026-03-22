"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Newspaper, Film, SquarePen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserNav } from '@/components/auth/user-nav';
import { adminSections } from '@/components/news/news-admin-navigation';
import { feedSections } from '@/components/feed/feed-navigation';

interface WorkspaceShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  {
    href: '/',
    label: '资讯页',
    icon: Newspaper,
  },
  {
    href: '/feed',
    label: '信息流页',
    icon: Film,
  },
  {
    href: '/admin',
    label: '录入后台',
    icon: SquarePen,
  },
];

export function WorkspaceShell({
  title,
  description,
  actions,
  children,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isFeedRoute = pathname === '/feed' || pathname.startsWith('/feed/');

  const getSubSections = (href: string) => {
    if (href === '/admin') return isAdminRoute ? adminSections : null;
    if (href === '/feed') return isFeedRoute ? feedSections : null;
    return null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-0 top-0 h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,_rgba(255,115,64,0.14),_transparent_65%)] blur-3xl" />
        <div className="absolute right-0 top-20 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,_rgba(100,170,255,0.09),_transparent_72%)] blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-border/70 bg-[#06080b]/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-[linear-gradient(135deg,#ff7a4d,#b54bff)]" />
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold tracking-tight text-foreground">ViraX</span>
                <span className="hidden rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground sm:inline-flex">
                  Workbench
                </span>
              </div>
            </div>

            <UserNav />
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-4rem)]">
          <aside className="hidden lg:flex lg:w-64 flex-col border-r border-border/70 bg-[#0a0d12]/80 backdrop-blur-xl">
            <nav className="flex-1 px-3 py-5">
              <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                Pages
              </div>
              <div className="space-y-2">
                {navigation.map((item) => {
                  const active = item.href === '/'
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <div key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all',
                          active
                            ? 'border-primary/35 bg-primary/10 text-foreground'
                            : 'border-transparent text-muted-foreground hover:border-border/80 hover:bg-card/50 hover:text-foreground'
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-xl border p-2 transition-colors',
                            active
                              ? 'border-primary/35 bg-primary/15 text-primary'
                              : 'border-border/70 bg-background/80'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </Link>

                      {getSubSections(item.href) ? (
                        <div className="mt-2 space-y-1 pl-4">
                          {getSubSections(item.href)?.map((section) => {
                            const sectionActive = pathname === section.href;
                            const SectionIcon = section.icon;

                            return (
                              <Link
                                key={section.href}
                                href={section.href}
                                className={cn(
                                  'group flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all',
                                  sectionActive
                                    ? 'border-primary/25 bg-primary/8 text-foreground'
                                    : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-card/40 hover:text-foreground'
                                )}
                              >
                                <div
                                  className={cn(
                                    'rounded-lg border p-1.5 transition-colors',
                                    sectionActive
                                      ? 'border-primary/30 bg-primary/12 text-primary'
                                      : 'border-border/60 bg-background/70'
                                  )}
                                >
                                  <SectionIcon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{section.shortLabel}</p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
              <div className="mx-auto w-full max-w-7xl">
                <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {navigation.map((item) => {
                    const active = item.href === '/'
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                          active
                            ? 'border-primary/35 bg-primary/10 text-primary'
                            : 'border-border/70 bg-card/70 text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                {isAdminRoute || isFeedRoute ? (
                  <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                    {(isAdminRoute ? adminSections : feedSections).map((section) => {
                      const active = pathname === section.href;
                      const Icon = section.icon;

                      return (
                        <Link
                          key={section.href}
                          href={section.href}
                          className={cn(
                            'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                            active
                              ? 'border-primary/35 bg-primary/10 text-primary'
                              : 'border-border/70 bg-card/70 text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {section.shortLabel}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
                      {title}
                    </h1>
                    {description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    ) : null}
                  </div>
                  {actions ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {actions}
                    </div>
                  ) : null}
                </div>

                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
