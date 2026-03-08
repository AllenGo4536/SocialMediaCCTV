
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [timeRange, setTimeRange] = useState<'all' | '30' | '7'>('all');
  const [filters, setFilters] = useState<FeedFilters>(initialFilters);
  const [uploaderOptions, setUploaderOptions] = useState<string[]>([]);
  const latestRequestIdRef = useRef(0);

  const fetchPosts = async (
    pageNum: number,
    refresh = false,
    range = timeRange,
    nextFilters = filters
  ) => {
    const requestId = ++latestRequestIdRef.current;
    try {
      setLoading(true);
      const res = await fetch(buildFeedUrl(pageNum, range, nextFilters));
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
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error("Failed to load feed: " + message);
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPosts(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    fetchPosts(newPage, true);
  };

  const handleRefresh = () => {
    setPage(1);
    fetchPosts(1, true);
  };

  const handleTimeRangeChange = (range: 'all' | '30' | '7') => {
    setTimeRange(range);
    setPage(1);
    fetchPosts(1, true, range, filters);
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
    fetchPosts(1, true, timeRange, nextFilters);
  };

  const togglePlatformFilter = (value: 'instagram' | 'tiktok' | 'youtube') => {
    const nextPlatforms = filters.platforms[0] === value ? [] : [value];
    const nextFilters = { ...filters, platforms: nextPlatforms };
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters);
  };

  const toggleBenchmarkFilter = (value: string) => {
    const nextBenchmarkTypes = filters.benchmarkTypes[0] === value ? [] : [value];
    const nextFilters = { ...filters, benchmarkTypes: nextBenchmarkTypes };
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters);
  };

  const handleUploaderChange = (email: string) => {
    const nextFilters = { ...filters, uploaders: email ? [email] : [] };
    setFilters(nextFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, nextFilters);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setPage(1);
    fetchPosts(1, true, timeRange, initialFilters);
  };

  const hasActiveFilters =
    filters.platforms.length > 0 ||
    filters.benchmarkTypes.length > 0 ||
    filters.cultureTags.length > 0 ||
    filters.contentTags.length > 0 ||
    filters.uploaders.length > 0;

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

          <div className="space-y-3 rounded-lg border border-border/60 bg-secondary/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">标签筛选</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                <FilterX className="w-3.5 h-3.5 mr-1" />
                清空筛选
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">平台</p>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.platforms[0] === option.value ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => togglePlatformFilter(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">对标类型</p>
              <div className="flex flex-wrap gap-2">
                {benchmarkOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.benchmarkTypes[0] === option.value ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => toggleBenchmarkFilter(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">文化</p>
              <div className="flex flex-wrap gap-2">
                {cultureOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.cultureTags.includes(option.value) ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => toggleFilter('cultureTags', option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">内容类型</p>
              <div className="flex flex-wrap gap-2">
                {contentOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.contentTags.includes(option.value) ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => toggleFilter('contentTags', option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">上传人（Email）</p>
              <select
                className="h-9 rounded-md border border-border bg-background px-3 text-sm w-full sm:w-[360px]"
                value={filters.uploaders[0] || ''}
                onChange={(e) => handleUploaderChange(e.target.value)}
              >
                <option value="">全部上传人</option>
                {uploaderOptions.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {posts.length === 0 && !loading ? (
            <div className="text-center py-20 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">暂无数据，请添加博主以开始监控。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {posts.map((post) => (
                <div key={post.id} className="h-full">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          )}

          {loading && (
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
