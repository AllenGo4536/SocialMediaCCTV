"use client";

import { useEffect, useMemo, useState } from 'react';
import { Clock3, Loader2, Pencil, Plus, RadioTower, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { WorkspaceShell } from '@/components/layout/workspace-shell';
import { getPlatformLabel, trackedSourcesSeed } from '@/lib/mock-news-data';
import type { NewsItem, NewsSourcePlatform, NewsStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FormState {
  title: string;
  summary: string;
  source_url: string;
  cover_image_url: string;
  source_platform: NewsSourcePlatform;
  author_name: string;
  published_at: string;
  status: NewsStatus;
}

const REQUESTED_BY = 'team@virax.local';

const defaultFormState: FormState = {
  title: '',
  summary: '',
  source_url: '',
  cover_image_url: '',
  source_platform: 'wechat',
  author_name: '',
  published_at: '2026-03-20T09:00',
  status: 'pending',
};

const statusLabels: Record<NewsStatus, string> = {
  pending: '待筛选',
  featured: '已入选',
  ignored: '已忽略',
};

const statusTone: Record<NewsStatus, string> = {
  pending: 'border-transparent bg-amber-500/12 text-amber-200',
  featured: 'border-transparent bg-emerald-500/12 text-emerald-300',
  ignored: 'border-transparent bg-zinc-500/15 text-zinc-300',
};

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toInputDateTime(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildFormState(item: NewsItem): FormState {
  return {
    title: item.title,
    summary: item.summary,
    source_url: item.source_url,
    cover_image_url: item.cover_image_url || '',
    source_platform: item.source_platform,
    author_name: item.author_name,
    published_at: toInputDateTime(item.published_at),
    status: item.status,
  };
}

export function NewsAdminPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | NewsStatus>('all');
  const [platformFilter, setPlatformFilter] = useState<NewsSourcePlatform | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [xSourceUrl, setXSourceUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = activeTab === 'all' || item.status === activeTab;
      const matchesPlatform = platformFilter === 'all' || item.source_platform === platformFilter;
      return matchesStatus && matchesPlatform;
    });
  }, [activeTab, items, platformFilter]);

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

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingId(null);
  };

  const handleEdit = (item: NewsItem) => {
    setEditingId(item.id);
    setFormState(buildFormState(item));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(editingId ? `/api/news/${editingId}` : '/api/news', {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formState,
          requestedBy: REQUESTED_BY,
          updatedBy: REQUESTED_BY,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '保存资讯失败');
      }

      toast.success(editingId ? '资讯已更新' : '资讯已入库');
      resetForm();
      await loadItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存资讯失败');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      if (editingId === id) resetForm();
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

  const handleImportFromX = async () => {
    const trimmedUrl = xSourceUrl.trim();
    if (!trimmedUrl) {
      toast.error('先贴一个 X 链接。');
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'single_url',
          sourceUrl: trimmedUrl,
          sourcePlatform: 'x',
          requestedBy: REQUESTED_BY,
          ingestMethod: 'manual',
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'X 导入失败');
      }

      const item = payload.newsItem as NewsItem;
      setXSourceUrl('');
      setEditingId(item.id);
      setFormState(buildFormState(item));
      toast.success(payload.deduped ? '已找到并刷新现有记录' : 'X 资讯已抓取并入库');
      await loadItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'X 导入失败');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <WorkspaceShell
      title="录入后台"
      description="支持手工录入，也支持直接粘贴 X 链接抓取入库。"
      actions={
        <Button
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/12"
          onClick={resetForm}
        >
          <Plus className="h-4 w-4" />
          新建资讯
        </Button>
      }
    >
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
          <Card className="border-border/70 bg-card/65 py-0">
            <CardHeader className="px-6 pt-6">
              <CardTitle>X 快速入库</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">X 文章 / 长帖 / 推文链接</label>
                <Input
                  value={xSourceUrl}
                  onChange={(event) => setXSourceUrl(event.target.value)}
                  placeholder="https://x.com/.../status/... 或 /article/..."
                />
              </div>
              <Button onClick={handleImportFromX} disabled={isImporting} className="w-full">
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
                抓取并入库
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                当前第一阶段只接了 X 渠道。服务端会通过 Apify 的 Twitter Scraper 拉正文、作者、时间、封面图和互动数据。
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/65 py-0 xl:sticky xl:top-24">
            <CardHeader className="px-6 pt-6">
              <CardTitle>{editingId ? '编辑资讯' : '新增资讯'}</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">标题</label>
                  <Input
                    value={formState.title}
                    onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                    placeholder="输入标题"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">摘要</label>
                  <textarea
                    value={formState.summary}
                    onChange={(event) => setFormState((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="输入摘要"
                    required
                    className="min-h-28 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">来源平台</label>
                    <select
                      value={formState.source_platform}
                      onChange={(event) => setFormState((current) => ({ ...current, source_platform: event.target.value as NewsSourcePlatform }))}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                    >
                      <option value="wechat">微信公众号</option>
                      <option value="x">X / Twitter</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">状态</label>
                    <select
                      value={formState.status}
                      onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as NewsStatus }))}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                    >
                      <option value="pending">待筛选</option>
                      <option value="featured">已入选</option>
                      <option value="ignored">已忽略</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">原文链接</label>
                  <Input
                    value={formState.source_url}
                    onChange={(event) => setFormState((current) => ({ ...current, source_url: event.target.value }))}
                    placeholder="https://..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">封面图链接</label>
                  <Input
                    value={formState.cover_image_url}
                    onChange={(event) => setFormState((current) => ({ ...current, cover_image_url: event.target.value }))}
                    placeholder="可选"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">作者名</label>
                    <Input
                      value={formState.author_name}
                      onChange={(event) => setFormState((current) => ({ ...current, author_name: event.target.value }))}
                      placeholder="作者 / 账号名"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">发布时间</label>
                    <Input
                      type="datetime-local"
                      value={formState.published_at}
                      onChange={(event) => setFormState((current) => ({ ...current, published_at: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingId ? '保存修改' : '录入资讯'}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="ghost" onClick={resetForm}>
                      取消编辑
                    </Button>
                  ) : null}
                </div>
              </form>
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
                        className="rounded-[20px] border border-border/70 bg-background/65 p-5"
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
                              <h3 className="text-lg font-medium leading-7 text-foreground">{item.title}</h3>
                              <p className="text-sm leading-6 text-muted-foreground">{item.summary}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <span>{item.author_name}</span>
                              <span className="text-border">•</span>
                              <span>{item.created_by}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 xl:w-[18rem] xl:justify-end">
                            <select
                              value={item.status}
                              onChange={(event) => handleStatusChange(item, event.target.value as NewsStatus)}
                              className="h-9 rounded-full border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
                            >
                              <option value="pending">待筛选</option>
                              <option value="featured">已入选</option>
                              <option value="ignored">已忽略</option>
                            </select>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                              <Pencil className="h-4 w-4" />
                              编辑
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(item.id)}>
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

          <Card className="border-border/70 bg-card/65 py-0">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="flex items-center gap-2">
                <RadioTower className="h-5 w-5 text-primary" />
                X 定向来源
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                {trackedSourcesSeed.map((source) => (
                  <div
                    key={source.id}
                    className="rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{source.display_name}</p>
                          <Badge className={source.status === 'active'
                            ? 'border-transparent bg-emerald-500/12 text-emerald-300'
                            : 'border-transparent bg-zinc-500/15 text-zinc-300'}>
                            {source.status === 'active' ? '跟踪中' : '暂停'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{source.handle}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">最近检查：{formatDateLabel(source.last_checked_at)}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      最新动态：{source.latest_headline}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </WorkspaceShell>
  );
}
