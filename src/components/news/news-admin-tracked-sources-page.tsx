"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RadioTower, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import type { TrackedSource } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NewsAdminShell } from '@/components/news/news-admin-shell';
import { formatDateLabel, normalizeXHandle } from '@/components/news/news-admin-shared';

export function NewsAdminTrackedSourcesPage() {
  const [trackedSources, setTrackedSources] = useState<TrackedSource[]>([]);
  const [trackedAuthorUrl, setTrackedAuthorUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTrackingAuthor, setIsTrackingAuthor] = useState(false);
  const { user, session, openAuthModal } = useAuth();

  const counts = useMemo(() => {
    return {
      total: trackedSources.length,
      active: trackedSources.filter((source) => source.status === 'active').length,
      paused: trackedSources.filter((source) => source.status === 'paused').length,
    };
  }, [trackedSources]);

  const loadTrackedSources = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tracked-sources', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '读取监控列表失败');
      }

      setTrackedSources(payload.items || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '读取监控列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTrackedSources();
  }, []);

  const handleTrackAuthor = async () => {
    const trimmedUrl = trackedAuthorUrl.trim();
    const normalizedHandle = normalizeXHandle(trimmedUrl);

    if (!user) {
      openAuthModal();
      return;
    }

    if (!normalizedHandle || !trimmedUrl) {
      toast.error('先填 X 博主主页链接。');
      return;
    }

    setIsTrackingAuthor(true);

    try {
      const response = await fetch('/api/tracked-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          authorUrl: trimmedUrl,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'X 博主添加失败');
      }

      setTrackedAuthorUrl('');
      toast.success(`已添加 @${normalizedHandle}，本次抓取 ${payload.totalPersisted || 0} 条资讯。`);
      await loadTrackedSources();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'X 博主添加失败');
    } finally {
      setIsTrackingAuthor(false);
    }
  };

  return (
    <NewsAdminShell
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
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">主页链接</label>
              <Input
                value={trackedAuthorUrl}
                onChange={(event) => setTrackedAuthorUrl(event.target.value)}
                placeholder="https://x.com/dontbesilent"
              />
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
              已关注博主
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {isLoading ? (
              <div className="flex items-center justify-center rounded-[20px] border border-border/70 bg-background/65 px-5 py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在加载监控列表...
              </div>
            ) : trackedSources.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-border/70 bg-background/50 px-5 py-10 text-center text-sm text-muted-foreground">
                当前还没有已关注博主。
              </div>
            ) : (
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
                        <p className="mt-1 text-xs text-muted-foreground/80">添加人：{source.created_by}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">最近检查：{formatDateLabel(source.last_checked_at)}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      最新动态：{source.latest_headline}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </NewsAdminShell>
  );
}
