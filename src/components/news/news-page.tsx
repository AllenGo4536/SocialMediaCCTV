"use client";

import { useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, FilterX, Newspaper, RadioTower, Sparkles, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WorkspaceShell } from '@/components/layout/workspace-shell';
import { getPlatformLabel, isWithinDays, newsItemsSeed } from '@/lib/mock-news-data';
import type { NewsItem, NewsSourcePlatform } from '@/types';

type RangeFilter = 'all' | '7' | '30';

const sourceOptions: Array<{ label: string; value: NewsSourcePlatform }> = [
  { label: 'X', value: 'x' },
  { label: '公众号', value: 'wechat' },
];

function formatDateLabel(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 24) {
    return `${Math.max(hours, 1)} 小时前`;
  }

  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function NewsHeroCard({
  item,
  accent,
  large = false,
}: {
  item: NewsItem;
  accent: string;
  large?: boolean;
}) {
  return (
    <a
      href={item.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <article
        className="relative h-full overflow-hidden rounded-[28px] border border-border/70 bg-card/85 transition-transform duration-300 group-hover:-translate-y-1"
      >
        {item.cover_image_url ? (
          <div className="absolute inset-0">
            <div
              aria-hidden="true"
              className="h-full w-full bg-cover bg-center opacity-30 transition duration-500 group-hover:scale-[1.03]"
              style={{ backgroundImage: `url(${item.cover_image_url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1117] via-[#0c1117]/80 to-[#0c1117]/20" />
          </div>
        ) : null}

        <div className={`relative flex h-full flex-col justify-between p-6 ${large ? 'min-h-[25rem]' : 'min-h-[12rem]'}`}>
          <div className="flex items-center justify-between gap-3">
            <Badge className={accent}>
              {getPlatformLabel(item.source_platform)}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {formatRelativeTime(item.published_at)}
            </span>
          </div>

          <div className="space-y-3">
            <h2 className={`max-w-2xl font-semibold tracking-tight text-balance text-foreground ${large ? 'text-3xl leading-tight' : 'text-xl leading-snug'}`}>
              {item.title}
            </h2>
            <p className={`max-w-2xl text-muted-foreground ${large ? 'text-base leading-7' : 'text-sm leading-6'}`}>
              {item.summary}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{item.author_name}</span>
              <span className="text-border">•</span>
              <span>{formatDateLabel(item.published_at)}</span>
              <span className="text-border">•</span>
              <span>{item.ingest_method === 'manual' ? '人工录入' : '自动跟踪后人工入选'}</span>
            </div>
          </div>
        </div>
      </article>
    </a>
  );
}

function NewsListItem({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-[24px] border border-border/70 bg-card/60 p-5 transition-all hover:border-primary/40 hover:bg-card/85"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/70 bg-background/70 text-muted-foreground">
              {getPlatformLabel(item.source_platform)}
            </Badge>
            <Badge
              className={item.ingest_method === 'manual'
                ? 'border-transparent bg-primary/12 text-primary'
                : 'border-transparent bg-sky-500/12 text-sky-300'}
              variant="secondary"
            >
              {item.ingest_method === 'manual' ? '手工录入' : '自动跟踪'}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDateLabel(item.published_at)}</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium leading-7 text-foreground transition-colors group-hover:text-primary">
              {item.title}
            </h3>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {item.summary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{item.author_name}</span>
            {item.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      </div>
    </a>
  );
}

export function NewsPage() {
  const [platformFilter, setPlatformFilter] = useState<NewsSourcePlatform | 'all'>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');

  const featuredItems = useMemo(() => {
    return newsItemsSeed
      .filter((item) => item.status === 'featured')
      .filter((item) => platformFilter === 'all' || item.source_platform === platformFilter)
      .filter((item) => {
        if (rangeFilter === 'all') return true;
        return isWithinDays(item.published_at, Number(rangeFilter));
      })
      .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
  }, [platformFilter, rangeFilter]);

  const topStories = featuredItems.filter((item) => item.is_top_story).slice(0, 3);
  const listStories = featuredItems.filter((item) => !topStories.some((topStory) => topStory.id === item.id));

  const activeFilters = platformFilter !== 'all' || rangeFilter !== 'all';

  return (
    <WorkspaceShell
      eyebrow="Editorial Intelligence"
      title="内部热点资讯"
      description="把团队真正要看的行业观察、平台动态和内容方法论从原始素材里筛出来。当前页面只展示已入选的图文资讯，所有自动内容都默认经过人工确认。"
    >
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.9fr)]">
        <Card className="overflow-hidden border-border/70 bg-card/75 py-0">
          <CardContent className="relative px-6 py-6 sm:px-8 sm:py-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_15rem] md:items-end">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Newsroom Brief
                </div>
                <div className="space-y-3">
                  <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-[2.6rem]">
                    首页先看结论，原始信息留给后续追溯。
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                    这是面向内部团队的热点资讯板。公众号文章负责深读，X 负责预警，自动跟踪内容只有在人工确认后才会出现在这里。
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">已入选资讯</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{featuredItems.length}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">今日自动信号</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {newsItemsSeed.filter((item) => item.ingest_method === 'auto_tracked').length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {[
            {
              label: '优先来源',
              value: 'X + 公众号',
              icon: RadioTower,
              tone: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
            },
            {
              label: '筛选逻辑',
              value: '人工确认后上首页',
              icon: Newspaper,
              tone: 'text-primary bg-primary/10 border-primary/20',
            },
            {
              label: '看板目标',
              value: '团队日常情报汇总',
              icon: TrendingUp,
              tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
            },
          ].map((item) => (
            <Card key={item.label} className="border-border/70 bg-card/65 py-0">
              <CardContent className="p-5">
                <div className={`inline-flex rounded-2xl border p-3 ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-lg font-medium leading-7 text-foreground">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-border/70 bg-card/55 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">筛选</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">先按来源和时间收敛，再看卡片层级</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-border/70 bg-background/70 p-1">
              <Button
                variant={platformFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-full"
                onClick={() => setPlatformFilter('all')}
              >
                全部
              </Button>
              {sourceOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={platformFilter === option.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPlatformFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="rounded-full border border-border/70 bg-background/70 p-1">
              {[
                { label: '全部时间', value: 'all' },
                { label: '近 7 天', value: '7' },
                { label: '近 30 天', value: '30' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={rangeFilter === option.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setRangeFilter(option.value as RangeFilter)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {activeFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={() => {
                  setPlatformFilter('all');
                  setRangeFilter('all');
                }}
              >
                <FilterX className="h-4 w-4" />
                清空筛选
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.95fr)]">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Top Stories</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">重点资讯区</h2>
            </div>
          </div>

          {topStories.length === 0 ? (
            <Card className="border-dashed border-border/70 bg-card/40 py-0">
              <CardContent className="p-8 text-center text-muted-foreground">
                当前筛选条件下暂无已入选资讯。
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.85fr)]">
              <NewsHeroCard item={topStories[0]} accent="border-transparent bg-primary/12 text-primary" large />
              <div className="grid gap-5">
                {topStories.slice(1).map((item) => (
                  <NewsHeroCard
                    key={item.id}
                    item={item}
                    accent={item.source_platform === 'x'
                      ? 'border-transparent bg-sky-500/12 text-sky-300'
                      : 'border-transparent bg-amber-500/12 text-amber-200'}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Card className="border-border/70 bg-card/65 py-0">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Board Notes</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-foreground">今日优先关注</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  先确认 X 自动跟踪的候选内容里，哪些值得被人工摘录成摘要，再决定是否进入首页。
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-foreground">公众号策略</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  当前只做人工录入和外链跳转，不做正文抓取。前端上优先验证“卡片是否足够表达价值”。
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-foreground">下阶段后端重点</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  先确认 X API 字段，再设计 `news_items` 与 `tracked_sources`。当前界面已经预留状态和来源概念。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Latest</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">最新资讯列表</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            共 {featuredItems.length} 条已入选资讯
          </p>
        </div>

        <div className="space-y-4">
          {listStories.map((item) => (
            <NewsListItem key={item.id} item={item} />
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}
