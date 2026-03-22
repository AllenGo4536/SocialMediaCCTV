"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FilterX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Post, Profile } from '@/types';
import { PostCard } from '@/components/feed/post-card';
import { Button } from '@/components/ui/button';
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

const initialFilters: FeedFilters = {
  platforms: [],
  benchmarkTypes: [],
  cultureTags: [],
  contentTags: [],
  uploaders: [],
};

function buildFeedUrl(pageNum: number, range: 'all' | '30' | '7', filters: FeedFilters) {
  const params = new URLSearchParams({
    page: String(pageNum),
    limit: '40',
    days: range,
  });

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
  const [timeRange, setTimeRange] = useState<'all' | '30' | '7'>('all');
  const [filters, setFilters] = useState<FeedFilters>(initialFilters);
  const [uploaderOptions, setUploaderOptions] = useState<string[]>([]);
  const latestRequestIdRef = useRef(0);
  const requestAbortControllerRef = useRef<AbortController | null>(null);

  const fetchPosts = async (
    pageNum: number,
    refresh = false,
    range = timeRange,
    nextFilters = filters,
    reason: FeedLoadingReason = 'refresh'
  ) => {
    const requestId = ++latestRequestIdRef.current;
    requestAbortControllerRef.current?.abort();
    const controller = new AbortController();
    requestAbortControllerRef.current = controller;

    try {
      setLoading(true);
      setLoadingReason(reason);
      const res = await fetch(buildFeedUrl(pageNum, range, nextFilters), {
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
    fetchPosts(1, true, 'all', initialFilters, 'initial');
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
    if (newPage < 1) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchPosts(newPage, true, timeRange, filters, 'pagination');
  };

  const handleTimeRangeChange = (range: 'all' | '30' | '7') => {
    if (range === timeRange) return;
    setTimeRange(range);
    setPage(1);
    fetchPosts(1, true, range, filters, 'filter');
  };

  const toggleFilter = (key: 'cultureTags' | 'contentTags', value: string) => {
    const current = filters[key] as string[];
    const exists = current.includes(value);
    const nextValues = exists ? current.filter((item) => item !== value) : [...current, value];
    const nextFilters = { ...filters, [key]: nextValues };
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters, 'filter');
  };

  const togglePlatformFilter = (value: 'instagram' | 'tiktok' | 'youtube') => {
    const nextPlatforms = filters.platforms[0] === value ? [] : [value];
    const nextFilters = { ...filters, platforms: nextPlatforms };
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters, 'filter');
  };

  const toggleBenchmarkFilter = (value: string) => {
    const nextBenchmarkTypes = filters.benchmarkTypes[0] === value ? [] : [value];
    const nextFilters = { ...filters, benchmarkTypes: nextBenchmarkTypes };
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters, 'filter');
  };

  const handleUploaderChange = (email: string) => {
    const nextFilters = { ...filters, uploaders: email ? [email] : [] };
    if (nextFilters.uploaders[0] === filters.uploaders[0]) return;
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters, 'filter');
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, initialFilters, 'filter');
  };

  const hasActiveFilters =
    filters.platforms.length > 0 ||
    filters.benchmarkTypes.length > 0 ||
    filters.cultureTags.length > 0 ||
    filters.contentTags.length > 0 ||
    filters.uploaders.length > 0;
  const isFilterLoading = loading && loadingReason === 'filter';

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
          { label: '当前帖子', value: posts.length, tone: 'text-foreground' },
          { label: '活跃筛选', value: hasActiveFilters ? '已启用' : '未启用', tone: hasActiveFilters ? 'text-primary' : 'text-muted-foreground' },
          { label: '时间范围', value: timeRange === 'all' ? '全部' : `近 ${timeRange} 天`, tone: 'text-sky-300' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-card/60 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className={`mt-2 text-xl font-semibold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 space-y-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
              <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className="mt-8 flex flex-col items-center gap-4 border-t border-border py-8">
          <div className="flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-1 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← 上一页
            </button>

            <div className="flex gap-2 text-muted-foreground">
              第 <span className="text-foreground">{page}</span> 页
            </div>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasMore}
              className="flex items-center gap-1 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              下一页 →
            </button>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
