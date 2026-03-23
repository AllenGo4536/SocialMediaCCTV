"use client";

import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { ArrowUpRight, Clock3, Eye, FilterX, Loader2 } from 'lucide-react';
import { matchesDateRange } from '@/lib/date-range';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { WorkspaceShell } from '@/components/layout/workspace-shell';
import { getPlatformLabel, isWithinDays } from '@/lib/mock-news-data';
import type { NewsItem, NewsSourcePlatform } from '@/types';

type RangeFilter = 'all' | '7' | '30';

const sourceOptions: Array<{ label: string; value: NewsSourcePlatform }> = [
  { label: 'X', value: 'x' },
  { label: '公众号', value: 'wechat' },
];

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 24) {
    return `${Math.max(hours, 1)} 小时前`;
  }

  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function formatReadCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1).replace(/\.0$/, '')} 万阅读`;
  }

  return `${value} 阅读`;
}

function getReadCount(item: NewsItem) {
  const value = item.source_metadata?.read_count;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function NewsImage({
  item,
}: {
  item: NewsItem;
}) {
  if (!item.cover_image_url) {
    return (
      <div className="flex h-full w-full items-end rounded-[18px] border border-border/50 bg-[radial-gradient(circle_at_top_left,rgba(255,107,61,0.08),transparent_45%),linear-gradient(180deg,rgba(19,26,34,0.92),rgba(12,16,20,0.96))] p-3.5">
        <Badge variant="outline" className="border-border/60 bg-background/50 px-2 py-0 text-[10px] text-muted-foreground">
          {getPlatformLabel(item.source_platform)}
        </Badge>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[18px] border border-border/50 bg-black/40">
      {/* Blurred Background Layer */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-xl"
        style={{ backgroundImage: `url(${item.cover_image_url})` }}
      />
      {/* Contained Image Layer */}
      <div
        className="relative h-full w-full bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(6,10,14,0.02), rgba(6,10,14,0.12)), url(${item.cover_image_url})` }}
      />
    </div>
  );
}

function NewsDiscoverCard({ item }: { item: NewsItem }) {
  const accent = item.source_platform === 'x'
    ? 'border-transparent bg-sky-500/10 text-sky-400'
    : 'border-transparent bg-amber-500/10 text-amber-500';
  const readCount = getReadCount(item);

  return (
    <a
      href={item.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col rounded-[22px] border border-border/60 bg-card/40 p-2.5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-card/60 hover:shadow-sm"
    >
      <div className="relative aspect-video w-full shrink-0">
        <NewsImage item={item} />
        {item.cover_image_url && (
          <div className="absolute right-2.5 top-2.5">
            <Badge className={`px-1.5 py-0 text-[10px] shadow-sm backdrop-blur-md ${accent}`}>
              {getPlatformLabel(item.source_platform)}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        {!item.cover_image_url && (
          <div className="mb-2 flex items-center justify-between">
            <Badge className={`px-1.5 py-0 text-[10px] ${accent}`}>
              {getPlatformLabel(item.source_platform)}
            </Badge>
          </div>
        )}

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.4] text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </h3>

        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground/90">
          {item.summary}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[11px] text-muted-foreground">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-medium text-foreground/70">{item.author_name}</span>
            <span className="text-border/60">•</span>
            <span className="flex shrink-0 items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {formatRelativeTime(item.published_at)}
            </span>
            {readCount !== null ? (
              <>
                <span className="text-border/60">•</span>
                <span className="flex shrink-0 items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatReadCount(readCount)}
                </span>
              </>
            ) : null}
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 translate-y-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
        </div>
      </div>
    </a>
  );
}

export function NewsPage() {
  const [platformFilter, setPlatformFilter] = useState<NewsSourcePlatform | 'all'>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
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
      .filter((item) => matchesDateRange(item.published_at, dateRange))
      .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
  }, [dateRange, items, platformFilter, rangeFilter]);

  const activeFilters = platformFilter !== 'all' || rangeFilter !== 'all' || Boolean(dateRange?.from);

  return (
    <WorkspaceShell
      title="内部热点资讯"
      description="已入选资讯"
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '已入选', value: featuredItems.length },
          { label: 'Top Stories', value: featuredItems.filter((item) => item.is_top_story).length },
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
                  onClick={() => {
                    setRangeFilter(option.value as RangeFilter);
                    setDateRange(undefined);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <DateRangeFilter
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                setRangeFilter('all');
              }}
              align="start"
              triggerClassName="h-10 min-w-[15rem]"
            />
          </div>

          {activeFilters ? (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-muted-foreground"
              onClick={() => {
                setPlatformFilter('all');
                setRangeFilter('all');
                setDateRange(undefined);
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
        ) : featuredItems.length === 0 ? (
          <Card className="border-dashed border-border/70 bg-card/40 py-0">
            <CardContent className="p-8 text-center text-muted-foreground">
              当前筛选条件下暂无已入选资讯。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredItems.map((item) => (
              <NewsDiscoverCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
