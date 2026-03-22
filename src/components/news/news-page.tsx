"use client";

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, FilterX, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WorkspaceShell } from '@/components/layout/workspace-shell';
import { getPlatformLabel, isWithinDays } from '@/lib/mock-news-data';
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

function NewsImage({
  item,
}: {
  item: NewsItem;
}) {
  if (!item.cover_image_url) {
    return (
      <div className="flex h-full items-end rounded-[28px] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(255,107,61,0.18),transparent_45%),linear-gradient(180deg,rgba(19,26,34,0.96),rgba(12,16,20,0.98))] p-5">
        <Badge variant="outline" className="border-border/70 bg-background/70 text-muted-foreground">
          {getPlatformLabel(item.source_platform)}
        </Badge>
      </div>
    );
  }

  return (
    <div
      className="h-full rounded-[28px] border border-border/70 bg-cover bg-center"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(6,10,14,0.06), rgba(6,10,14,0.24)), url(${item.cover_image_url})` }}
    />
  );
}

function NewsHeroCard({
  item,
  accent,
}: {
  item: NewsItem;
  accent: string;
}) {
  return (
    <a
      href={item.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <article className="rounded-[30px] border border-border/70 bg-card/72 p-3 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:bg-card/88">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
          <div className="flex min-w-0 flex-col justify-between rounded-[26px] bg-[#101722] px-6 py-6 sm:px-7 sm:py-7">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <Badge className={accent}>{getPlatformLabel(item.source_platform)}</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatRelativeTime(item.published_at)}
                </span>
              </div>

              <div className="space-y-4">
                <h2 className="line-clamp-3 max-w-3xl text-[clamp(1.8rem,2.9vw,3.15rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground">
                  {item.title}
                </h2>
                <p className="line-clamp-5 max-w-2xl text-[15px] leading-7 text-[#c7d0db]">
                  {item.summary}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="max-w-[18rem] truncate rounded-full bg-background/80 px-3 py-1.5 text-[12px] text-[#d7dde6]">
                {item.author_name}
              </span>
              <span>{formatDateLabel(item.published_at)}</span>
            </div>
          </div>

          <div className="aspect-[16/11] min-h-[18rem]">
            <NewsImage item={item} />
          </div>
        </div>
      </article>
    </a>
  );
}

function NewsStoryCard({
  item,
  accent,
}: {
  item: NewsItem;
  accent: string;
}) {
  return (
    <a
      href={item.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <article className="overflow-hidden rounded-[26px] border border-border/70 bg-card/68 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:bg-card/84">
        <div className="aspect-[16/10] p-3">
          <NewsImage item={item} />
        </div>

        <div className="space-y-4 px-5 pb-5 pt-1">
          <div className="flex items-center justify-between gap-3">
            <Badge className={accent}>{getPlatformLabel(item.source_platform)}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {formatRelativeTime(item.published_at)}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="line-clamp-3 text-[1.45rem] font-semibold leading-[1.18] tracking-[-0.02em] text-foreground transition-colors group-hover:text-primary">
              {item.title}
            </h3>
            <p className="line-clamp-3 text-[14px] leading-6 text-muted-foreground">
              {item.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="max-w-[14rem] truncate">{item.author_name}</span>
            <span className="text-border">•</span>
            <span>{formatDateLabel(item.published_at)}</span>
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
      className="group block h-full rounded-[26px] border border-border/70 bg-card/66 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:bg-card/82"
    >
      <article className="flex h-full flex-col">
        <div className="aspect-[4/3]">
          <NewsImage item={item} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-between px-2 pb-2 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/70 bg-background/70 text-muted-foreground">
              {getPlatformLabel(item.source_platform)}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDateLabel(item.published_at)}</span>
          </div>

          <div className="mt-3 space-y-3">
            <h3 className="line-clamp-3 text-[1.55rem] font-semibold leading-[1.18] tracking-[-0.02em] text-foreground transition-colors group-hover:text-primary">
              {item.title}
            </h3>
            <p className="line-clamp-3 text-[14px] leading-6 text-muted-foreground">
              {item.summary}
            </p>
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="max-w-[12rem] truncate">{item.author_name}</span>
              {item.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>

            <ArrowUpRight className="mb-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>
        </div>
      </article>
    </a>
  );
}

export function NewsPage() {
  const [platformFilter, setPlatformFilter] = useState<NewsSourcePlatform | 'all'>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedItems() {
      try {
        const response = await fetch('/api/news?status=featured', { cache: 'no-store' });
        const payload = await response.json();

        if (response.ok && Array.isArray(payload.items)) {
          setItems(payload.items);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadFeaturedItems();
  }, []);

  const featuredItems = useMemo(() => {
    return items
      .filter((item) => platformFilter === 'all' || item.source_platform === platformFilter)
      .filter((item) => {
        if (rangeFilter === 'all') return true;
        return isWithinDays(item.published_at, Number(rangeFilter));
      })
      .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
  }, [items, platformFilter, rangeFilter]);

  const topStories = (
    featuredItems.some((item) => item.is_top_story)
      ? featuredItems.filter((item) => item.is_top_story)
      : featuredItems
  ).slice(0, 3);
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
          { label: '自动来源', value: items.filter((item) => item.ingest_method === 'auto_tracked').length },
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
        {isLoading ? (
          <Card className="border-dashed border-border/70 bg-card/40 py-0">
            <CardContent className="flex items-center justify-center gap-2 p-8 text-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载资讯...
            </CardContent>
          </Card>
        ) : topStories.length === 0 ? (
          <Card className="border-dashed border-border/70 bg-card/40 py-0">
            <CardContent className="p-8 text-center text-muted-foreground">
              当前筛选条件下暂无已入选资讯。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(21rem,0.88fr)]">
            <NewsHeroCard item={topStories[0]} accent="border-transparent bg-primary/12 text-primary" />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
              {topStories.slice(1).map((item) => (
                <NewsStoryCard
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

      {listStories.length > 0 ? (
        <section className="mt-8 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {listStories.map((item) => (
            <NewsListItem key={item.id} item={item} />
          ))}
        </section>
      ) : null}
    </WorkspaceShell>
  );
}
