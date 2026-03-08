
"use client";

import { useEffect, useRef, useState } from 'react';
import { PostCard } from '@/components/feed/post-card';
import { AddProfileForm } from '@/components/profile/add-profile-form';
import { Button } from '@/components/ui/button';
import { Post, Profile } from '@/types';
import { Loader2, FilterX } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/site-header';

interface FeedFilters {
  platforms: Array<'instagram' | 'tiktok' | 'youtube'>;
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

const platformOptions = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
] as const;

const benchmarkOptions = [
  { value: 'ip_benchmark', label: 'IP对标' },
  { value: 'aesthetic_benchmark', label: '美学对标' },
];

const cultureOptions = [
  { value: 'culture_me', label: '中东' },
  { value: 'culture_west', label: '欧美' },
];

const contentOptions = [
  { value: 'style_performance_camera', label: '穿搭/唱跳/运镜' },
  { value: 'pov', label: 'POV' },
  { value: 'daily_life', label: '日常记录' },
  { value: 'asmr', label: 'ASMR' },
  { value: 'virtual_idol', label: '虚拟偶像' },
];

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

export default function Home() {
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
        setPosts(prev => [...prev, ...payload.data]);
      }

      setHasMore(payload.meta.hasMore);
    } catch (err: unknown) {
      if (requestId !== latestRequestIdRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error("Failed to load feed: " + message);
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

  const handleRefresh = () => {
    setPage(1);
    fetchPosts(1, true, timeRange, filters, 'refresh');
  };

  const handleTimeRangeChange = (range: 'all' | '30' | '7') => {
    if (range === timeRange) return;
    setTimeRange(range);
    setPage(1);
    fetchPosts(1, true, range, filters, 'filter');
  };

  const toggleFilter = (
    key: 'cultureTags' | 'contentTags',
    value: string
  ) => {
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
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-grow container mx-auto px-4 py-4 max-w-7xl space-y-12">

        {/* Add Creator Section */}
        <section className="w-full">
          <div className="rounded-xl border border-border/60 bg-secondary/15 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">达人管理入口</h2>
              <p className="text-sm text-muted-foreground mt-1">
                点击按钮后，在弹窗中填写平台、用户名、链接与标签。
              </p>
            </div>
            <div className="shrink-0">
              <AddProfileForm onSuccess={() => handleRefresh()} />
            </div>
          </div>
        </section>

        {/* Feed Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <h2 className="text-lg font-bold">
                热门帖子 · <span className="text-muted-foreground font-normal">按 <span className="text-primary font-bold">点赞数</span> 排序</span>
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-border/50">
              <Button
                variant={timeRange === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTimeRangeChange('all')}
                className="h-8 text-xs font-medium"
              >
                全部
              </Button>
              <Button
                variant={timeRange === '30' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTimeRangeChange('30')}
                className="h-8 text-xs font-medium"
              >
                近30天
              </Button>
              <Button
                variant={timeRange === '7' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTimeRangeChange('7')}
                className="h-8 text-xs font-medium"
              >
                近7天
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-secondary/10 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {/* 标题 + loading */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-muted-foreground">筛选</span>
                {isFilterLoading && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </span>
                )}
              </div>

              {/* 平台 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/70 shrink-0">平台</span>
                <div className="flex items-center gap-1">
                  {platformOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${filters.platforms[0] === option.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                        }`}
                      onClick={() => togglePlatformFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-border/60 select-none hidden sm:inline">|</span>

              {/* 对标类型 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/70 shrink-0">对标</span>
                <div className="flex items-center gap-1">
                  {benchmarkOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${filters.benchmarkTypes[0] === option.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                        }`}
                      onClick={() => toggleBenchmarkFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-border/60 select-none hidden sm:inline">|</span>

              {/* 文化 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/70 shrink-0">文化</span>
                <div className="flex items-center gap-1">
                  {cultureOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${filters.cultureTags.includes(option.value)
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                        }`}
                      onClick={() => toggleFilter('cultureTags', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-border/60 select-none hidden sm:inline">|</span>

              {/* 内容类型 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/70 shrink-0">内容</span>
                <div className="flex items-center gap-1">
                  {contentOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${filters.contentTags.includes(option.value)
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                        }`}
                      onClick={() => toggleFilter('contentTags', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-border/60 select-none hidden sm:inline">|</span>

              {/* 上传人 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/70 shrink-0">上传人</span>
                <select
                  className="h-7 rounded-full border border-border/60 bg-transparent px-2.5 text-[11px] text-muted-foreground hover:border-border hover:text-foreground transition-all cursor-pointer focus:outline-none focus:border-primary max-w-[180px]"
                  value={filters.uploaders[0] || ''}
                  onChange={(e) => handleUploaderChange(e.target.value)}
                >
                  <option value="">全部</option>
                  {uploaderOptions.map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
              </div>

              {/* 清空筛选 */}
              {hasActiveFilters && (
                <button
                  className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                  onClick={clearFilters}
                >
                  <FilterX className="w-3 h-3" />
                  清空
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <div className={`transition-opacity duration-150 ${isFilterLoading ? 'opacity-60' : 'opacity-100'}`}>
              {posts.length === 0 && !loading ? (
                <div className="text-center py-20 border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">暂无数据，请添加博主以开始监控。</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {posts.map((post, index) => (
                    <div key={post.id} className="h-full">
                      <PostCard post={post} priority={index < 4} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {isFilterLoading && posts.length > 0 && (
              <div className="absolute inset-0 pointer-events-none flex items-start justify-center pt-8">
                <div className="rounded-full border border-border bg-background/95 px-3 py-1.5 shadow-sm text-xs inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  正在更新筛选结果...
                </div>
              </div>
            )}
          </div>

          {loading && !isFilterLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </section>

        {/* Pagination Footer */}
        {!loading && posts.length > 0 && (
          <div className="flex flex-col items-center gap-4 py-8 border-t border-border mt-8">
            <div className="flex items-center gap-6 text-sm font-medium">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-1 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← 上一页
              </button>

              <div className="text-muted-foreground flex gap-2">
                第 <span className="text-foreground">{page}</span> 页
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={!hasMore}
                className="flex items-center gap-1 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页 →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
