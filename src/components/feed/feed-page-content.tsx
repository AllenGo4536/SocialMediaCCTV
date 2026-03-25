"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { FilterX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { toDateRangeQuery } from '@/lib/date-range';
import { Post, Profile } from '@/types';
import { PostCard } from '@/components/feed/post-card';
import { Button } from '@/components/ui/button';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { WorkspaceShell } from '@/components/layout/workspace-shell';
import {
  BENCHMARK_OPTIONS,
  CONTENT_OPTIONS,
  CULTURE_OPTIONS,
  PLATFORM_OPTIONS,
} from '@/lib/taxonomy';
import type { Platform } from '@/lib/taxonomy';

interface FeedFilters {
  platforms: Array<Platform>;
  benchmarkTypes: string[];
  cultureTags: string[];
  contentTags: string[];
  uploaders: string[];
}

type FeedLoadingReason = 'initial' | 'filter' | 'pagination' | 'refresh';
type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

const PAGE_SIZE = 40;

const initialFilters: FeedFilters = {
  platforms: [],
  benchmarkTypes: [],
  cultureTags: [],
  contentTags: [],
  uploaders: [],
};

function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    end = 5;
  }

  if (currentPage >= totalPages - 2) {
    start = totalPages - 4;
  }

  const items: PaginationItem[] = [1];

  if (start > 2) {
    items.push('start-ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push('end-ellipsis');
  }

  items.push(totalPages);
  return items;
}

function buildFeedUrl(
  pageNum: number,
  range: 'all' | '30' | '7',
  filters: FeedFilters,
  dateRange?: DateRange
) {
  const dateRangeQuery = toDateRangeQuery(dateRange);
  const params = new URLSearchParams({
    page: String(pageNum),
    limit: '40',
    days: range,
  });

  if (dateRangeQuery.startDate) {
    params.set('startDate', dateRangeQuery.startDate);
  }

  if (dateRangeQuery.endDate) {
    params.set('endDate', dateRangeQuery.endDate);
  }

  if (filters.platforms.length > 0) {
    params.set('platforms', filters.platforms.join(','));
  }
  if (filters.benchmarkTypes.length > 0) {
    params.set('benchmarkTypes', filters.benchmarkTypes.join(','));
  }
  if (filters.cultureTags.length > 0) {
    params.set('cultureTags', filters.cultureTags.join(','));
  }
  if (filters.contentTags.length > 0) {
    params.set('contentTags', filters.contentTags.join(','));
  }
  if (filters.uploaders.length > 0) {
    params.set('uploaders', filters.uploaders.join(','));
  }

  return `/api/feed?${params.toString()}`;
}

export function FeedPageContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReason, setLoadingReason] = useState<FeedLoadingReason | null>('initial');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [timeRange, setTimeRange] = useState<'all' | '30' | '7'>('30');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filters, setFilters] = useState<FeedFilters>(initialFilters);
  const [uploaderOptions, setUploaderOptions] = useState<string[]>([]);
  const latestRequestIdRef = useRef(0);
  const requestAbortControllerRef = useRef<AbortController | null>(null);

  const fetchPosts = async (
    pageNum: number,
    refresh = false,
    range = timeRange,
    nextFilters = filters,
    reason: FeedLoadingReason = 'refresh',
    nextDateRange = dateRange
  ) => {
    const requestId = ++latestRequestIdRef.current;
    requestAbortControllerRef.current?.abort();
    const controller = new AbortController();
    requestAbortControllerRef.current = controller;

    try {
      setLoading(true);
      setLoadingReason(reason);
      const res = await fetch(buildFeedUrl(pageNum, range, nextFilters, nextDateRange), {
        signal: controller.signal,
      });
      const payload = await res.json();

      if (!res.ok) throw new Error(payload.error);
      if (requestId !== latestRequestIdRef.current) return;

      if (refresh) {
        setPosts(payload.data);
      } else {
        setPosts((prev) => [...prev, ...payload.data]);
      }

      setHasMore(payload.meta.hasMore);
      setTotalPosts(payload.meta.total ?? 0);
      setTotalPages(payload.meta.totalPages ?? 0);
    } catch (err: unknown) {
      if (requestId !== latestRequestIdRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to load feed: ${message}`);
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
        setLoadingReason(null);
      }
    }
  };

  useEffect(() => {
    fetchPosts(1, true, '30', initialFilters, 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      requestAbortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    fetch('/api/profiles')
      .then((res) => res.json())
      .then((profiles: Profile[]) => {
        const emails = [...new Set(profiles.map((profile) => profile.creator_email).filter(Boolean))] as string[];
        setUploaderOptions(emails);
      })
      .catch(() => {
        setUploaderOptions([]);
      });
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (totalPages > 0 && newPage > totalPages)) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchPosts(newPage, true, timeRange, filters, 'pagination', dateRange);
  };

  const handleTimeRangeChange = (range: 'all' | '30' | '7') => {
    if (range === timeRange) return;
    setTimeRange(range);
    setDateRange(undefined);
    setPage(1);
    fetchPosts(1, true, range, filters, 'filter', undefined);
  };

  const toggleFilter = (key: 'cultureTags' | 'contentTags', value: string) => {
    const current = filters[key] as string[];
    const exists = current.includes(value);
    const nextValues = exists ? current.filter((item) => item !== value) : [...current, value];
    const nextFilters = { ...filters, [key]: nextValues };
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters, 'filter', dateRange);
  };

  const togglePlatformFilter = (value: 'instagram' | 'tiktok' | 'youtube') => {
    const nextPlatforms = filters.platforms[0] === value ? [] : [value];
    const nextFilters = { ...filters, platforms: nextPlatforms };
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters, 'filter', dateRange);
  };

  const toggleBenchmarkFilter = (value: string) => {
    const nextBenchmarkTypes = filters.benchmarkTypes[0] === value ? [] : [value];
    const nextFilters = { ...filters, benchmarkTypes: nextBenchmarkTypes };
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters, 'filter', dateRange);
  };

  const handleUploaderChange = (email: string) => {
    const nextFilters = { ...filters, uploaders: email ? [email] : [] };
    if (nextFilters.uploaders[0] === filters.uploaders[0]) return;
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters, 'filter', dateRange);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setTimeRange('30');
    setDateRange(undefined);
    setPage(1);
    fetchPosts(1, true, '30', initialFilters, 'filter', undefined);
  };

  const hasActiveFilters =
    timeRange !== 'all' ||
    Boolean(dateRange?.from) ||
    filters.platforms.length > 0 ||
    filters.benchmarkTypes.length > 0 ||
    filters.cultureTags.length > 0 ||
    filters.contentTags.length > 0 ||
    filters.uploaders.length > 0;
  const isFilterLoading = loading && loadingReason === 'filter';
  const currentRangeStart = totalPosts === 0 || posts.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const currentRangeEnd = totalPosts === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + posts.length, totalPosts);
  const paginationItems = totalPages > 1 ? buildPaginationItems(page, totalPages) : [1];

  return (
    <WorkspaceShell
      title="信息流页"
      description="视频素材池"
      actions={
        <Button asChild>
          <Link href="/feed/creators">添加达人</Link>
        </Button>
      }
    >
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: '当前帖子', value: totalPosts, tone: 'text-foreground' },
          { label: '活跃筛选', value: hasActiveFilters ? '已启用' : '未启用', tone: hasActiveFilters ? 'text-primary' : 'text-muted-foreground' },
          { label: '时间范围', value: dateRange?.from ? '自定义范围' : (timeRange === 'all' ? '全部' : `近 ${timeRange} 天`), tone: 'text-sky-300' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-card/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className={`mt-1.5 text-[15px] font-medium ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 space-y-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/65 p-1">
              <Button
                variant={timeRange === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTimeRangeChange('all')}
                className="rounded-full"
              >
                全部
              </Button>
              <Button
                variant={timeRange === '30' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTimeRangeChange('30')}
                className="rounded-full"
              >
                近30天
              </Button>
              <Button
                variant={timeRange === '7' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTimeRangeChange('7')}
                className="rounded-full"
              >
                近7天
              </Button>
            </div>

            <DateRangeFilter
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                setTimeRange('all');
                setPage(1);
                fetchPosts(1, true, 'all', filters, 'filter', range);
              }}
              align="start"
              triggerClassName="h-10 min-w-[15rem]"
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-border/70 bg-card/55 px-4 py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">筛选</span>
              {isFilterLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground/70">平台</span>
              <div className="flex flex-wrap gap-1">
                {PLATFORM_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${filters.platforms[0] === option.value
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground'
                      }`}
                    onClick={() => togglePlatformFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="hidden text-border/60 sm:inline">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground/70">对标</span>
              <div className="flex flex-wrap gap-1">
                {BENCHMARK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${filters.benchmarkTypes[0] === option.value
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground'
                      }`}
                    onClick={() => toggleBenchmarkFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="hidden text-border/60 sm:inline">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground/70">文化</span>
              <div className="flex flex-wrap gap-1">
                {CULTURE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${filters.cultureTags.includes(option.value)
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground'
                      }`}
                    onClick={() => toggleFilter('cultureTags', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="hidden text-border/60 sm:inline">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground/70">内容</span>
              <div className="flex flex-wrap gap-1">
                {CONTENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${filters.contentTags.includes(option.value)
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground'
                      }`}
                    onClick={() => toggleFilter('contentTags', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="hidden text-border/60 sm:inline">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground/70">上传人</span>
              <select
                className="h-7 max-w-[180px] rounded-full border border-border/60 bg-transparent px-2.5 text-[11px] text-muted-foreground transition-all focus:border-primary focus:outline-none hover:border-border hover:text-foreground"
                value={filters.uploaders[0] || ''}
                onChange={(event) => handleUploaderChange(event.target.value)}
              >
                <option value="">全部</option>
                {uploaderOptions.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                onClick={clearFilters}
              >
                <FilterX className="h-3 w-3" />
                清空
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <div className={`transition-opacity duration-150 ${isFilterLoading ? 'opacity-60' : 'opacity-100'}`}>
            {posts.length === 0 && !loading ? (
              <div className="rounded-[24px] border border-dashed border-border bg-card/40 py-20 text-center">
                <p className="text-muted-foreground">暂无数据，请添加博主以开始监控。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {posts.map((post, index) => (
                  <div key={post.id} className="h-full">
                    <PostCard post={post} priority={index < 4} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {isFilterLoading && posts.length > 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-8">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                正在更新筛选结果...
              </div>
            </div>
          )}
        </div>
      </section>

      {!loading && posts.length > 0 && (
        <div className="mt-8 border-t border-border py-8">
          <nav aria-label="信息流分页" className="flex flex-col items-center gap-4">
            <div aria-live="polite" className="text-center text-sm text-muted-foreground">
              第 <span className="font-semibold text-foreground">{page}</span> /{' '}
              <span className="font-semibold text-foreground">{Math.max(totalPages, 1)}</span> 页
              <span className="mx-2 text-border/70">·</span>
              显示 <span className="font-semibold text-foreground">{currentRangeStart}-{currentRangeEnd}</span>，共{' '}
              <span className="font-semibold text-foreground">{totalPosts}</span> 条
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="inline-flex h-10 items-center rounded-full border border-border/70 px-4 text-sm transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← 上一页
              </button>

              <div className="flex items-center gap-2">
                {paginationItems.map((item) => {
                  if (typeof item !== 'number') {
                    return (
                      <span key={item} aria-hidden="true" className="px-1 text-muted-foreground">
                        …
                      </span>
                    );
                  }

                  const isCurrentPage = item === page;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-current={isCurrentPage ? 'page' : undefined}
                      onClick={() => handlePageChange(item)}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm transition-all ${isCurrentPage
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border/70 text-muted-foreground hover:border-primary hover:text-primary'
                        }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={!hasMore}
                className="inline-flex h-10 items-center rounded-full border border-border/70 px-4 text-sm transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                下一页 →
              </button>
            </div>
          </nav>
        </div>
      )}
    </WorkspaceShell>
  );
}
