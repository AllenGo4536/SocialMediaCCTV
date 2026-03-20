"use client";

import { useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, FilterX } from 'lucide-react';
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
      <article className="relative h-full overflow-hidden rounded-[24px] border border-border/70 bg-card/85 transition-transform duration-300 group-hover:-translate-y-1">
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

        <div className={`relative flex h-full flex-col justify-between p-5 ${large ? 'min-h-[23rem]' : 'min-h-[11.25rem]'}`}>
          <div className="flex items-center justify-between gap-3">
            <Badge className={accent}>{getPlatformLabel(item.source_platform)}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {formatRelativeTime(item.published_at)}
            </span>
          </div>

          <div className="space-y-3">
            <h2 className={`max-w-2xl font-semibold tracking-tight text-balance text-foreground ${large ? 'text-[28px] leading-tight' : 'text-lg leading-snug'}`}>
              {item.title}
            </h2>
            <p className={`max-w-2xl text-muted-foreground ${large ? 'text-sm leading-6' : 'text-sm leading-6'}`}>
              {item.summary}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{item.author_name}</span>
              <span className="text-border">•</span>
              <span>{formatDateLabel(item.published_at)}</span>
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
      className="group block rounded-[20px] border border-border/70 bg-card/60 p-5 transition-all hover:border-primary/40 hover:bg-card/85"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/70 bg-background/70 text-muted-foreground">
              {getPlatformLabel(item.source_platform)}
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
      title="内部热点资讯"
      description="已入选资讯"
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '已入选', value: featuredItems.length },
          { label: 'Top Stories', value: topStories.length },
          { label: '自动来源', value: newsItemsSeed.filter((item) => item.ingest_method === 'auto_tracked').length },
          { label: '来源平台', value: 'X + 公众号' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-card/60 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-[24px] border border-border/70 bg-card/55 p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
          </div>

          {activeFilters ? (
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
          ) : null}
        </div>
      </section>

      <section className="mt-6">
        {topStories.length === 0 ? (
          <Card className="border-dashed border-border/70 bg-card/40 py-0">
            <CardContent className="p-8 text-center text-muted-foreground">
              当前筛选条件下暂无已入选资讯。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)]">
            <NewsHeroCard item={topStories[0]} accent="border-transparent bg-primary/12 text-primary" large />
            <div className="grid gap-4">
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
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">最新资讯</h2>
          <p className="text-sm text-muted-foreground">{featuredItems.length} 条</p>
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
