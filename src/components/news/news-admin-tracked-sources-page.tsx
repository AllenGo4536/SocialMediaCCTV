"use client";

import { useMemo, useState } from 'react';
import { Loader2, RadioTower, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { trackedSourcesSeed } from '@/lib/mock-news-data';
import type { TrackedSource } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NewsAdminShell } from '@/components/news/news-admin-shell';
import { formatDateLabel, normalizeXHandle, REQUESTED_BY } from '@/components/news/news-admin-shared';

export function NewsAdminTrackedSourcesPage() {
  const [trackedSources, setTrackedSources] = useState<TrackedSource[]>(trackedSourcesSeed);
  const [trackedAuthorHandle, setTrackedAuthorHandle] = useState('');
  const [trackedAuthorUrl, setTrackedAuthorUrl] = useState('');
  const [trackedMaxItems, setTrackedMaxItems] = useState('10');
  const [isTrackingAuthor, setIsTrackingAuthor] = useState(false);

  const counts = useMemo(() => {
    return {
      total: trackedSources.length,
      active: trackedSources.filter((source) => source.status === 'active').length,
      paused: trackedSources.filter((source) => source.status === 'paused').length,
    };
  }, [trackedSources]);

  const handleTrackAuthor = async () => {
    const normalizedHandle = normalizeXHandle(trackedAuthorHandle || trackedAuthorUrl);
    const trimmedUrl = trackedAuthorUrl.trim();
    const maxItems = Math.max(1, Number.parseInt(trackedMaxItems, 10) || 10);

    if (!normalizedHandle && !trimmedUrl) {
      toast.error('先填 X 博主账号或主页链接。');
      return;
    }

    setIsTrackingAuthor(true);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'author_tracking',
          authorHandle: normalizedHandle,
          authorUrl: trimmedUrl || undefined,
          sourcePlatform: 'x',
          requestedBy: REQUESTED_BY,
          ingestMethod: 'auto_tracked',
          sort: 'Latest',
          maxItems,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'X 博主添加失败');
      }

      const latestItem = payload.items?.[0];
      const nextSource: TrackedSource = {
        id: `source-${normalizedHandle || Date.now()}`,
        platform: 'x',
        handle: `@${normalizedHandle || 'unknown'}`,
        display_name: latestItem?.sourceRecord?.author_name || `@${normalizedHandle}`,
        status: 'active',
        last_checked_at: new Date().toISOString(),
        latest_headline: latestItem?.newsItem?.title || '已创建跟踪来源，等待下一次抓取。',
      };

      setTrackedSources((current) => {
        const withoutSameHandle = current.filter((item) => item.handle.toLowerCase() !== nextSource.handle.toLowerCase());
        return [nextSource, ...withoutSameHandle];
      });
      setTrackedAuthorHandle('');
      setTrackedAuthorUrl('');
      setTrackedMaxItems(String(maxItems));
      toast.success(`已添加 ${nextSource.handle}，本次抓取 ${payload.totalPersisted || 0} 条资讯。`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'X 博主添加失败');
    } finally {
      setIsTrackingAuthor(false);
    }
  };

  return (
    <NewsAdminShell
      sectionTitle="X博主定向监控"
      sectionDescription="这个页面单独负责增加 X 博主、维护已关注博主列表，以及查看每个来源最近一次抓取到的动态。"
      actions={
        <Button
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/12"
          onClick={() => {
            document.getElementById('tracked-source-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <UserPlus className="h-4 w-4" />
          增加 X 博主
        </Button>
      }
    >
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: '已关注博主', value: counts.total, tone: 'text-foreground' },
          { label: '跟踪中', value: counts.active, tone: 'text-emerald-300' },
          { label: '暂停中', value: counts.paused, tone: 'text-zinc-300' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-card/60 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className={`mt-2 text-xl font-semibold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <Card id="tracked-source-entry" className="border-primary/25 bg-card/65 py-0 shadow-[0_0_0_1px_rgba(255,115,64,0.08)]">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              增加 X 博主
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="rounded-2xl border border-primary/20 bg-primary/6 px-4 py-3 text-sm leading-6 text-muted-foreground">
              在这里添加要持续监控的 X 博主。提交后会按博主维度抓取最新内容，并把结果按自动来源写入资讯候选池。
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">X 账号</label>
              <Input
                value={trackedAuthorHandle}
                onChange={(event) => setTrackedAuthorHandle(event.target.value)}
                placeholder="@dontbesilent 或 https://x.com/dontbesilent"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">主页链接（可选）</label>
                <Input
                  value={trackedAuthorUrl}
                  onChange={(event) => setTrackedAuthorUrl(event.target.value)}
                  placeholder="https://x.com/dontbesilent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">抓取条数</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={trackedMaxItems}
                  onChange={(event) => setTrackedMaxItems(event.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleTrackAuthor} disabled={isTrackingAuthor} className="w-full">
              {isTrackingAuthor ? <Loader2 className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
              添加到监控列表
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/65 py-0">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="flex items-center gap-2">
              <RadioTower className="h-5 w-5 text-primary" />
              已关注博主 List
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3">
              {trackedSources.map((source) => (
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
      </section>
    </NewsAdminShell>
  );
}
