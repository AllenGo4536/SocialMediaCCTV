"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { WorkspaceShell } from '@/components/layout/workspace-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { detectPlatformFromProfileUrl } from '@/lib/profile-input';
import type { Platform } from '@/lib/taxonomy';
import type { Profile } from '@/types';

const platformLabels: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

const tagToneByGroup = {
  benchmark_type: 'border-transparent bg-primary/12 text-primary',
  culture: 'border-border/60 bg-background/80 text-muted-foreground',
  content_type: 'border-border/60 bg-background/80 text-muted-foreground',
} as const;

export function FeedCreatorsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileUrl, setProfileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user, session, openAuthModal } = useAuth();

  const counts = useMemo(() => {
    return {
      total: profiles.length,
      instagram: profiles.filter((profile) => profile.platform === 'instagram').length,
      tiktok: profiles.filter((profile) => profile.platform === 'tiktok').length,
    };
  }, [profiles]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profiles', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || '读取达人失败');
      }
      setProfiles(payload || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '读取达人失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

  const handleAddCreator = async () => {
    const trimmedUrl = profileUrl.trim();
    const platform = detectPlatformFromProfileUrl(trimmedUrl);

    if (!trimmedUrl) {
      toast.error('先填达人主页链接。');
      return;
    }

    if (!platform) {
      toast.error('暂时只支持 Instagram、TikTok、YouTube 的主页链接。');
      return;
    }

    if (!user) {
      openAuthModal();
      return;
    }

    setSubmitting(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platform,
          input: trimmedUrl,
          benchmarkType: 'ip_benchmark',
          cultureTags: [],
          contentTags: [],
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '达人添加失败');
      }

      setProfileUrl('');
      toast.success('达人添加成功，正在抓取最新内容');
      await loadProfiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '达人添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkspaceShell
      title="信息流页"
      actions={
        <Button
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/12"
          onClick={() => {
            document.getElementById('feed-creator-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <UserPlus className="h-4 w-4" />
          添加达人
        </Button>
      }
    >
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: '已录入达人', value: counts.total, tone: 'text-foreground' },
          { label: 'Instagram', value: counts.instagram, tone: 'text-pink-300' },
          { label: 'TikTok', value: counts.tiktok, tone: 'text-cyan-300' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-card/60 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className={`mt-2 text-xl font-semibold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <Card id="feed-creator-entry" className="border-primary/25 bg-card/65 py-0 shadow-[0_0_0_1px_rgba(255,115,64,0.08)]">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              达人录入
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">主页链接</label>
              <Input
                value={profileUrl}
                onChange={(event) => setProfileUrl(event.target.value)}
                placeholder="https://www.instagram.com/... 或 https://www.tiktok.com/@..."
              />
            </div>

            <Button onClick={handleAddCreator} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              添加到达人池
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/65 py-0">
          <CardHeader className="px-6 pt-6">
            <CardTitle>已录入达人</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center rounded-[20px] border border-border/70 bg-background/65 px-5 py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在加载达人...
              </div>
            ) : profiles.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-border/70 bg-background/50 px-5 py-10 text-center text-sm text-muted-foreground">
                当前还没有录入达人。
              </div>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{profile.full_name || `@${profile.username}`}</p>
                          <Badge className="border-transparent bg-primary/12 text-primary">
                            {platformLabels[profile.platform]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
                        {profile.tags && profile.tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {profile.tags.map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className={tagToneByGroup[tag.group]}
                              >
                                {tag.label}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        <a
                          href={profile.profile_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 block truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {profile.profile_url}
                        </a>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {profile.creator_email || '内部录入'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </WorkspaceShell>
  );
}
