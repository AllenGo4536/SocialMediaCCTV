"use client";

import type { KeyboardEvent, MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, Loader2, RadioTower, Trash2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { matchesDateRange } from '@/lib/date-range';
import { getPlatformLabel } from '@/lib/mock-news-data';
import type { NewsItem, NewsSourcePlatform, NewsStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewsAdminShell } from '@/components/news/news-admin-shell';
import {
  formatDateLabel,
  REQUESTED_BY,
  statusLabels,
  statusTone,
} from '@/components/news/news-admin-shared';

export function NewsAdminArticlesPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | NewsStatus>('all');
  const [platformFilter, setPlatformFilter] = useState<NewsSourcePlatform | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sourceUrl, setSourceUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const { user, session, openAuthModal } = useAuth();

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = activeTab === 'all' || item.status === activeTab;
      const matchesPlatform = platformFilter === 'all' || item.source_platform === platformFilter;
      const matchesPublishedAt = matchesDateRange(item.published_at, dateRange);
      return matchesStatus && matchesPlatform && matchesPublishedAt;
    });
  }, [activeTab, dateRange, items, platformFilter]);

  const counts = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((item) => item.status === 'pending').length,
      featured: items.filter((item) => item.status === 'featured').length,
    };
  }, [items]);

  async function loadItems() {
    setIsLoading(true);

    try {
      const response = await fetch('/api/news', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '读取资讯失败');
      }

      setItems(payload.items || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '读取资讯失败');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '删除资讯失败');
      }

      toast.success('资讯已删除');
      await loadItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除资讯失败');
    }
  };

  const handleStatusChange = async (item: NewsItem, status: NewsStatus) => {
    try {
      const response = await fetch(`/api/news/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...item,
          status,
          updatedBy: REQUESTED_BY,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '更新状态失败');
      }

      setItems((current) => current.map((newsItem) => (
        newsItem.id === item.id ? payload.item : newsItem
      )));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新状态失败');
    }
  };

  const handleImportFromUrl = async () => {
    const trimmedUrl = sourceUrl.trim();
    if (!user) {
      openAuthModal();
      return;
    }
    if (!trimmedUrl) {
      toast.error('先贴一个资讯链接。');
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'single_url',
          sourceUrl: trimmedUrl,
          ingestMethod: 'manual',
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '资讯导入失败');
      }

      setSourceUrl('');
      toast.success(payload.deduped ? '已找到并刷新现有记录' : '资讯已抓取并入库');
      await loadItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '资讯导入失败');
    } finally {
      setIsImporting(false);
    }
  };

  const openSourceUrl = (sourceUrl: string) => {
    if (!sourceUrl) return;
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  };

  const stopCardNavigation = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return (
    <NewsAdminShell>
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: '总资讯数', value: counts.total, tone: 'text-foreground' },
          { label: '待筛选', value: counts.pending, tone: 'text-amber-200' },
          { label: '已入选首页', value: counts.featured, tone: 'text-emerald-300' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-card/60 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className={`mt-2 text-xl font-semibold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="border-border/70 bg-card/65 py-0 xl:sticky xl:top-24">
            <CardHeader className="px-6 pt-6">
              <CardTitle>资讯链接入库</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">资讯链接</label>
                <Input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://x.com/.../status/... 或 https://mp.weixin.qq.com/..."
                />
              </div>

              <Button onClick={handleImportFromUrl} disabled={isImporting} className="w-full">
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
                识别来源并入库
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/65 py-0">
            <CardContent className="p-6">
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as 'all' | NewsStatus)}
                className="gap-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <TabsList className="h-auto rounded-full border border-border/70 bg-background/70 p-1">
                      <TabsTrigger value="all" className="rounded-full px-4">全部</TabsTrigger>
                      <TabsTrigger value="pending" className="rounded-full px-4">待筛选</TabsTrigger>
                      <TabsTrigger value="featured" className="rounded-full px-4">已入选</TabsTrigger>
                      <TabsTrigger value="ignored" className="rounded-full px-4">已忽略</TabsTrigger>
                    </TabsList>

                    <div className="rounded-full border border-border/70 bg-background/70 p-1">
                      <Button
                        variant={platformFilter === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="rounded-full"
                        onClick={() => setPlatformFilter('all')}
                      >
                        全部来源
                      </Button>
                      <Button
                        variant={platformFilter === 'wechat' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="rounded-full"
                        onClick={() => setPlatformFilter('wechat')}
                      >
                        公众号
                      </Button>
                      <Button
                        variant={platformFilter === 'x' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="rounded-full"
                        onClick={() => setPlatformFilter('x')}
                      >
                        X
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <DateRangeFilter value={dateRange} onChange={setDateRange} />
                  </div>
                </div>

                <TabsContent value={activeTab} className="mt-0">
                  <div className="mt-6 space-y-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center rounded-[20px] border border-border/70 bg-background/65 px-5 py-10 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        正在加载资讯...
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-border/70 bg-background/50 px-5 py-10 text-center text-sm text-muted-foreground">
                        当前没有符合条件的资讯。
                      </div>
                    ) : filteredItems.map((item) => (
                      <article
                        key={item.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => openSourceUrl(item.source_url)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openSourceUrl(item.source_url);
                          }
                        }}
                        className="cursor-pointer rounded-[20px] border border-border/70 bg-background/65 p-5 transition hover:border-primary/60 hover:bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/60"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={statusTone[item.status]}>{statusLabels[item.status]}</Badge>
                              <Badge variant="outline" className="border-border/70 bg-card/80 text-muted-foreground">
                                {getPlatformLabel(item.source_platform)}
                              </Badge>
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock3 className="h-3.5 w-3.5" />
                                {formatDateLabel(item.published_at)}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <h3
                                  className="text-lg font-medium leading-7 text-foreground"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {item.title}
                                </h3>
                                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                              </div>
                              <p
                                className="text-sm leading-6 text-muted-foreground"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 4,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {item.summary}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <span>{item.author_name}</span>
                              <span className="text-border">•</span>
                              <span>{item.created_by}</span>
                            </div>
                            <p className="text-xs text-muted-foreground/85">
                              点击卡片查看原文
                            </p>
                          </div>

                          <div
                            className="flex flex-wrap items-center gap-2 xl:w-[18rem] xl:justify-end"
                            onClick={stopCardNavigation}
                            onKeyDown={stopCardNavigation}
                          >
                            <select
                              value={item.status}
                              onChange={(event) => handleStatusChange(item, event.target.value as NewsStatus)}
                              className="h-9 rounded-full border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
                            >
                              <option value="pending">待筛选</option>
                              <option value="featured">已入选</option>
                              <option value="ignored">已忽略</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>
    </NewsAdminShell>
  );
}

export { NewsAdminArticlesPage as NewsAdminPage };
