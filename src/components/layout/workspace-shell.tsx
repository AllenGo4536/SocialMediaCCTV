"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Newspaper, Film, SquarePen, ArrowUpRight, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserNav } from '@/components/auth/user-nav';

interface WorkspaceShellProps {
  title: string;
  description: string;
  eyebrow: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  {
    href: '/',
    label: '资讯页',
    description: '内部热点与行业观察',
    icon: Newspaper,
  },
  {
    href: '/feed',
    label: '信息流页',
    description: '视频内容监控与筛选',
    icon: Film,
  },
  {
    href: '/admin',
    label: '录入后台',
    description: '录入、筛选与来源管理',
    icon: SquarePen,
  },
];

export function WorkspaceShell({
  title,
  description,
  eyebrow,
  actions,
  children,
}: WorkspaceShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute left-0 top-0 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(255,115,64,0.16),_transparent_65%)] blur-3xl" />
        <div className="absolute right-0 top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(100,170,255,0.12),_transparent_70%)] blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-col border-r border-border/70 bg-card/55 backdrop-blur-xl">
          <div className="border-b border-border/70 px-6 py-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              ViraX Workbench
            </div>
            <div className="mt-5 space-y-2">
              <h2 className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                社媒情报工作台
              </h2>
              <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                把热点资讯、视频信息流和录入动作拆开管理，让团队每天进入系统时先看到结论，再回看素材池。
              </p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
              Navigation
            </div>
            <div className="space-y-2">
              {navigation.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group block rounded-2xl border px-4 py-4 transition-all',
                      active
                        ? 'border-primary/40 bg-primary/12 shadow-[0_0_0_1px_rgba(255,107,61,0.08)]'
                        : 'border-transparent bg-transparent hover:border-border/80 hover:bg-card/60'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 rounded-xl border p-2.5 transition-colors',
                          active
                            ? 'border-primary/40 bg-primary/15 text-primary'
                            : 'border-border/70 bg-background/80 text-muted-foreground group-hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{item.label}</span>
                          {active && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-border/70 p-4">
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                Current Mode
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                当前界面使用模拟数据推进结构设计，先确认产品形态，再反推后端模型与 API 字段。
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
            <div className="px-4 py-4 sm:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">
                    {eyebrow}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {title}
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] text-muted-foreground">
                      Internal Only
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                    {description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {actions}
                  <UserNav />
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {navigation.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                        active
                          ? 'border-primary/40 bg-primary/12 text-primary'
                          : 'border-border/70 bg-card/70 text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
