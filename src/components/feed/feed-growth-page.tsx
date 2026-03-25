"use client";

import { useCallback, useEffect, useId, useState } from 'react';
import { ArrowUpRight, Clock3, Gauge, Loader2, RefreshCcw, TrendingUp, Users } from 'lucide-react';
import { WorkspaceShell } from '@/components/layout/workspace-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type WindowDays = 7 | 14 | 30;

interface GrowthItem {
  profile_id: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  current_followers: number;
  baseline_followers: number;
  delta_followers: number;
  velocity_followers_per_day: number;
  growth_rate_pct: number | null;
  tracked_days: number;
  actual_window_days: number;
  has_full_window: boolean;
  last_recorded_at: string;
  sparkline: Array<{ date: string; followers: number }>;
}

interface GrowthMeta {
  platform: 'instagram' | 'tiktok' | 'youtube';
  windowDays: number;
  totalProfiles: number;
  rankedProfiles: number;
  insufficientProfiles: number;
  positiveGrowthCount: number;
  averageVelocity: number;
  generatedAt: string;
}

const WINDOW_OPTIONS: WindowDays[] = [7, 14, 30];

function formatCompactNumber(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '暂无';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

function formatSignedNumber(value: number) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatCompactNumber(value)}`;
}

function formatPercent(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '暂无';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

function formatMetaTime(value?: string) {
  if (!value) return '暂无';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无';

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getAvatarFallback(item: GrowthItem) {
  return (item.full_name || item.username).slice(0, 1).toUpperCase();
}

function Sparkline({ data }: { data: Array<{ date: string; followers: number }> }) {
  const gradientToken = useId().replace(/:/g, '');

  if (data.length < 2) {
    return <div className="h-14 rounded-2xl border border-border/60 bg-background/60" />;
  }

  const min = Math.min(...data.map((point) => point.followers));
  const max = Math.max(...data.map((point) => point.followers));
  const range = Math.max(max - min, 1);

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((point.followers - min) / range) * 100;
    return `${x},${y}`;
  });

  return (
    <div className="relative h-14 overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`growth-sparkline-stroke-${gradientToken}`} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(84, 255, 190, 0.55)" />
            <stop offset="100%" stopColor="rgba(255, 152, 71, 0.9)" />
          </linearGradient>
          <linearGradient id={`growth-sparkline-fill-${gradientToken}`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(84, 255, 190, 0.22)" />
            <stop offset="100%" stopColor="rgba(84, 255, 190, 0.02)" />
          </linearGradient>
        </defs>

        <polyline
          fill="none"
          stroke={`url(#growth-sparkline-stroke-${gradientToken})`}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points.join(' ')}
        />
        <polygon
          fill={`url(#growth-sparkline-fill-${gradientToken})`}
          points={`0,100 ${points.join(' ')} 100,100`}
        />
      </svg>
    </div>
  );
}

export function FeedGrowthPage() {
  const [items, setItems] = useState<GrowthItem[]>([]);
  const [meta, setMeta] = useState<GrowthMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState<WindowDays>(7);
  const [error, setError] = useState<string | null>(null);

  const loadGrowth = useCallback(async (nextWindowDays: WindowDays) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/feed/growth?platform=instagram&windowDays=${nextWindowDays}&limit=50`, {
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '读取涨粉榜失败');
      }

      setItems(payload.data || []);
      setMeta(payload.meta || null);
    } catch (nextError) {
      setItems([]);
      setMeta(null);
      setError(nextError instanceof Error ? nextError.message : '读取涨粉榜失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGrowth(windowDays);
  }, [loadGrowth, windowDays]);

  const leader = items[0] || null;
  const actions = (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/70 bg-card/70 p-1">
        {WINDOW_OPTIONS.map((option) => (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setWindowDays(option)}
            className={cn(
              'rounded-full px-4 text-xs',
              windowDays === option
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            近 {option} 天
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => void loadGrowth(windowDays)}
        disabled={loading}
        className="rounded-full border-border/70 bg-card/70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        刷新榜单
      </Button>
    </>
  );

  return (
    <WorkspaceShell
      title="涨粉雷达"
      description="基于主页快照追踪 Instagram 达人的粉丝增长速度。榜单按日均涨粉排序，需要至少两次快照才会进入排名。"
      actions={actions}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-emerald-500/20 bg-[linear-gradient(135deg,rgba(13,30,24,0.95),rgba(8,14,16,0.94))]">
              <CardHeader className="gap-3">
                <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200">头号加速者</Badge>
                <CardTitle className="text-xl text-foreground">
                  {leader ? (leader.full_name || `@${leader.username}`) : '等待数据'}
                </CardTitle>
                <CardDescription className="text-muted-foreground/90">
                  {leader ? `平均 ${formatSignedNumber(leader.velocity_followers_per_day)}/天` : '至少需要两次主页快照'}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-sky-500/20 bg-[linear-gradient(135deg,rgba(10,22,34,0.95),rgba(8,12,18,0.94))]">
              <CardHeader className="gap-3">
                <div className="flex items-center gap-2 text-sky-200">
                  <Users className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.22em]">进入排名</span>
                </div>
                <CardTitle className="text-3xl text-foreground">{meta?.rankedProfiles ?? 0}</CardTitle>
                <CardDescription className="text-muted-foreground/90">
                  共跟踪 {meta?.totalProfiles ?? 0} 个账号，{meta?.positiveGrowthCount ?? 0} 个在增长
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-amber-500/20 bg-[linear-gradient(135deg,rgba(34,24,10,0.95),rgba(18,12,8,0.94))]">
              <CardHeader className="gap-3">
                <div className="flex items-center gap-2 text-amber-200">
                  <Gauge className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.22em]">平均速度</span>
                </div>
                <CardTitle className="text-3xl text-foreground">
                  {formatSignedNumber(meta?.averageVelocity ?? 0)}
                </CardTitle>
                <CardDescription className="text-muted-foreground/90">
                  当前以近 {windowDays} 天窗口计算日均涨粉
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card className="overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(8,11,15,0.96),rgba(8,10,14,0.98))]">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
                涨粉排行榜
              </CardTitle>
              <CardDescription>
                速度按 `净增粉丝 / 实际覆盖天数` 计算。覆盖不足 {windowDays} 天的账号仍会显示，但会标记实际跟踪天数。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {loading ? (
                <div className="flex min-h-[18rem] items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-background/40">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在计算涨粉速度
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-[24px] border border-red-500/20 bg-red-500/6 px-5 py-6 text-sm text-red-200">
                  {error}
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-border/60 bg-background/40 px-5 py-8 text-sm text-muted-foreground">
                  当前还没有足够的历史快照。等下一轮主页抓取完成后，这里会出现涨粉速度排名。
                </div>
              ) : (
                items.map((item, index) => (
                  <div
                    key={item.profile_id}
                    className="rounded-[24px] border border-border/70 bg-background/45 p-4 transition-colors hover:border-primary/25 hover:bg-background/60"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                              {index + 1}
                            </div>
                            <Avatar className="h-12 w-12 border border-border/60">
                              <AvatarImage src={item.avatar_url || undefined} alt={item.full_name || item.username} />
                              <AvatarFallback className="bg-primary/12 text-primary">
                                {getAvatarFallback(item)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-lg font-semibold text-foreground">
                                {item.full_name || `@${item.username}`}
                              </p>
                              <Badge className="border-transparent bg-primary/12 text-primary">Instagram</Badge>
                              <Badge
                                className={cn(
                                  'border-transparent',
                                  item.delta_followers >= 0
                                    ? 'bg-emerald-500/10 text-emerald-200'
                                    : 'bg-red-500/10 text-red-200'
                                )}
                              >
                                {formatSignedNumber(item.delta_followers)}
                              </Badge>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                              <span>@{item.username}</span>
                              <span>当前粉丝 {formatCompactNumber(item.current_followers)}</span>
                              <span>增长率 {formatPercent(item.growth_rate_pct)}</span>
                            </div>

                            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                              <div className="rounded-2xl border border-border/60 bg-background/55 px-3 py-2">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">日均涨粉</div>
                                <div className="mt-1 text-base font-semibold text-foreground">
                                  {formatSignedNumber(item.velocity_followers_per_day)}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-border/60 bg-background/55 px-3 py-2">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">基准粉丝</div>
                                <div className="mt-1 text-base font-semibold text-foreground">
                                  {formatCompactNumber(item.baseline_followers)}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-border/60 bg-background/55 px-3 py-2">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">实际覆盖</div>
                                <div className="mt-1 text-base font-semibold text-foreground">
                                  {Math.max(1, Math.round(item.actual_window_days))} 天
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="w-full xl:max-w-[280px]">
                        <Sparkline data={item.sparkline} />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-3.5 w-3.5" />
                            最近更新 {formatMetaTime(item.last_recorded_at)}
                          </div>
                          {item.profile_url ? (
                            <a
                              href={item.profile_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
                            >
                              查看主页
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(13,16,24,0.96),rgba(10,11,17,0.98))]">
            <CardHeader>
              <CardTitle>读榜说明</CardTitle>
              <CardDescription>这个榜单回答的不是“谁粉丝最多”，而是“谁最近涨得更快”。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                `涨粉速度 = 窗口内净增粉丝 / 实际覆盖天数`
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                当前窗口：近 {windowDays} 天。若账号历史不足 {windowDays} 天，会按已采集到的天数折算速度。
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                只有至少两次主页快照的账号才会进入排名。当前未满足条件的账号数：{meta?.insufficientProfiles ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(18,15,10,0.94),rgba(10,10,12,0.98))]">
            <CardHeader>
              <CardTitle>数据覆盖</CardTitle>
              <CardDescription>快照来自主页详情抓取，不依赖单条帖子表现。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                <span className="text-sm text-muted-foreground">已录入 Instagram 账号</span>
                <span className="text-lg font-semibold text-foreground">{meta?.totalProfiles ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                <span className="text-sm text-muted-foreground">已进入速度排名</span>
                <span className="text-lg font-semibold text-foreground">{meta?.rankedProfiles ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                <span className="text-sm text-muted-foreground">最近生成时间</span>
                <span className="text-sm font-medium text-foreground">{formatMetaTime(meta?.generatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </WorkspaceShell>
  );
}
