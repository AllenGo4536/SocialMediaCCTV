
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

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchPosts = async (pageNum: number, refresh = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/feed?page=${pageNum}&limit=40`);
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
    // Logic for standard pagination (not infinite scroll anymore per wireframe "Page 1 2 3")
    // My API supports offset. So I should clear posts and fetch new page.
    setLoading(true);
    fetch(`/api/feed?page=${newPage}&limit=40`)
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
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border bg-background py-4 sticky top-0 z-10 w-full mb-8">
        <div className="container mx-auto px-4 flex justify-between items-start">
          <div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="ViraX" width={120} height={40} className="h-8 w-auto" priority />
                <span className="text-lg font-semibold text-muted-foreground/80 border-l border-border pl-3 tracking-wide">
                  内部工具
                </span>
              </div>
              <p className="text-muted-foreground text-xs font-medium tracking-wider pl-1 uppercase opacity-70">
                社媒博主定向监控
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/10">
                管理博主
              </Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-4 max-w-7xl space-y-12">

        {/* Add Creator Section */}
        <section className="space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-primary">
            <Search className="w-4 h-4" />
            <span className="text-sm font-medium">添加 Instagram 博主</span>
          </div>
          <div className="w-full">
            <AddProfileForm onSuccess={() => handleRefresh()} secretKey="" className="w-full" />
          </div>
        </section>

        {/* Feed Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-bold">
              热门帖子 · <span className="text-muted-foreground font-normal">按 <span className="text-primary font-bold">点赞数</span> 排序</span>
            </h2>
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
