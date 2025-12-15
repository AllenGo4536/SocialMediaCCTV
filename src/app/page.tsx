
"use client";

import { useEffect, useState } from 'react';
import { PostCard } from '@/components/feed/post-card';
import { AddProfileForm } from '@/components/profile/add-profile-form';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/auth/user-nav';
import { Post } from '@/types';
import { Loader2, ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { SiteHeader } from '@/components/layout/site-header';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [statsTrigger, setStatsTrigger] = useState(0);

  const [timeRange, setTimeRange] = useState<'all' | '30' | '7'>('30');

  const fetchPosts = async (pageNum: number, refresh = false, range = timeRange) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/feed?page=${pageNum}&limit=40&days=${range}`);
      const payload = await res.json();

      if (!res.ok) throw new Error(payload.error);

      if (refresh) {
        setPosts(payload.data);
      } else {
        setPosts(prev => [...prev, ...payload.data]);
      }

      setHasMore(payload.meta.hasMore);
      setTotal(payload.meta.total);
    } catch (err: any) {
      toast.error("Failed to load feed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, true);
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setLoading(true);
    fetch(`/api/feed?page=${newPage}&limit=40&days=${timeRange}`)
      .then(res => res.json())
      .then(payload => {
        setPosts(payload.data);
        setHasMore(payload.meta.hasMore);
        setLoading(false);
      });
  };

  const handleRefresh = () => {
    setPage(1);
    fetchPosts(1, true);
    setStatsTrigger(prev => prev + 1);
  };

  const handleTimeRangeChange = (range: 'all' | '30' | '7') => {
    setTimeRange(range);
    setPage(1);
    fetchPosts(1, true, range);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-grow container mx-auto px-4 py-4 max-w-7xl space-y-12">

        {/* Add Creator Section */}
        <section className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Add Profile Form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Search className="w-4 h-4" />
                <span className="text-sm font-medium">添加 Instagram 博主</span>
              </div>
              <AddProfileForm onSuccess={() => handleRefresh()} className="w-full" />
            </div>

            {/* Right: Dashboard Stats */}
            <div className="lg:col-span-1 pt-0 lg:pt-10">
              <DashboardStats refreshKey={statsTrigger} />
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
