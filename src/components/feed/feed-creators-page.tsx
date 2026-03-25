"use client";

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2, PencilLine, Search, Tags, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { WorkspaceShell } from '@/components/layout/workspace-shell';
import { ProfileTagFields } from '@/components/profile/profile-tag-fields';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { detectPlatformFromProfileUrl } from '@/lib/profile-input';
import type { BenchmarkTag, ContentTag, CultureTag, Platform } from '@/lib/taxonomy';
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

function formatMetaTime(value?: string) {
  if (!value) return '暂无';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无';

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function FeedCreatorsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileUrl, setProfileUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPlatform, setCreatePlatform] = useState<Platform | null>(null);
  const [createBenchmarkType, setCreateBenchmarkType] = useState<BenchmarkTag | ''>('');
  const [createCultureTags, setCreateCultureTags] = useState<CultureTag[]>([]);
  const [createContentTags, setCreateContentTags] = useState<ContentTag[]>([]);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editBenchmarkType, setEditBenchmarkType] = useState<BenchmarkTag | ''>('');
  const [editCultureTags, setEditCultureTags] = useState<CultureTag[]>([]);
  const [editContentTags, setEditContentTags] = useState<ContentTag[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const { user, session, openAuthModal } = useAuth();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const counts = useMemo(() => {
    return {
      total: profiles.length,
      instagram: profiles.filter((profile) => profile.platform === 'instagram').length,
      tiktok: profiles.filter((profile) => profile.platform === 'tiktok').length,
    };
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const keyword = deferredSearchQuery.trim().toLowerCase();
    if (!keyword) return profiles;

    return profiles.filter((profile) => {
      const searchableText = [
        profile.full_name,
        profile.username,
        profile.profile_url,
        profile.creator_email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [deferredSearchQuery, profiles]);

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

  const resetCreateTags = () => {
    setCreateBenchmarkType('');
    setCreateCultureTags([]);
    setCreateContentTags([]);
  };

  const extractTagState = (profile: Profile) => {
    const benchmarkTag = profile.tags?.find((tag) => tag.group === 'benchmark_type')?.id ?? '';
    return {
      benchmarkType: benchmarkTag as BenchmarkTag | '',
      cultureTags: (profile.tags || [])
        .filter((tag) => tag.group === 'culture')
        .map((tag) => tag.id) as CultureTag[],
      contentTags: (profile.tags || [])
        .filter((tag) => tag.group === 'content_type')
        .map((tag) => tag.id) as ContentTag[],
    };
  };

  const handleStartAddCreator = () => {
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

    resetCreateTags();
    setCreatePlatform(platform);
    setCreateDialogOpen(true);
  };

  const handleConfirmAddCreator = async () => {
    const trimmedUrl = profileUrl.trim();
    if (!createPlatform || !trimmedUrl) {
      toast.error('请先填写有效的达人主页链接。');
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
          platform: createPlatform,
          input: trimmedUrl,
          ...(createBenchmarkType ? { benchmarkType: createBenchmarkType } : {}),
          cultureTags: createCultureTags,
          contentTags: createContentTags,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '达人添加失败');
      }

      setProfileUrl('');
      resetCreateTags();
      setCreatePlatform(null);
      setCreateDialogOpen(false);
      toast.success('达人添加成功，正在抓取最新内容');
      await loadProfiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '达人添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (profile: Profile) => {
    if (!user) {
      openAuthModal();
      return;
    }

    const next = extractTagState(profile);
    setEditingProfile(profile);
    setEditBenchmarkType(next.benchmarkType);
    setEditCultureTags(next.cultureTags);
    setEditContentTags(next.contentTags);
  };

  const handleSaveProfileTags = async () => {
    if (!editingProfile) {
      return;
    }
    if (!user) {
      openAuthModal();
      return;
    }

    setSavingTags(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/profiles/${editingProfile.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...(editBenchmarkType ? { benchmarkType: editBenchmarkType } : {}),
          cultureTags: editCultureTags,
          contentTags: editContentTags,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '标签更新失败');
      }

      setEditingProfile(null);
      toast.success('标签已更新');
      await loadProfiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '标签更新失败');
    } finally {
      setSavingTags(false);
    }
  };

  const getAvatarFallback = (profile: Profile) => {
    const seed = (profile.full_name || profile.username || profile.platform).trim();
    return seed.charAt(0).toUpperCase();
  };

  const avatarFallbackTone = (platform: Platform) => {
    if (platform === 'instagram') return 'bg-pink-500/15 text-pink-200';
    if (platform === 'tiktok') return 'bg-cyan-500/15 text-cyan-200';
    return 'bg-red-500/15 text-red-200';
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

            <Button onClick={handleStartAddCreator} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              选择标签并录入
            </Button>

            <p className="text-xs text-muted-foreground">
              点击后会弹出标签选择框；品牌官方账号请选择“品牌官方号”，不选标签则会自动保存为“未分类”。
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/65 py-0">
          <CardHeader className="px-6 pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>已录入达人</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {deferredSearchQuery.trim()
                    ? `当前匹配 ${filteredProfiles.length} / ${profiles.length} 位达人`
                    : `共 ${profiles.length} 位达人`}
                </p>
              </div>
              <div className="relative w-full lg:w-[22rem]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索达人名、用户名、链接"
                  className="pl-9"
                />
              </div>
            </div>
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
            ) : filteredProfiles.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-border/70 bg-background/50 px-5 py-10 text-center text-sm text-muted-foreground">
                没有找到匹配的达人，试试搜用户名或主页链接。
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex items-start gap-3">
                        <Avatar className="mt-0.5 h-11 w-11 border border-border/60">
                          <AvatarImage src={profile.avatar_url} alt={profile.full_name || profile.username} />
                          <AvatarFallback className={avatarFallbackTone(profile.platform)}>
                            {getAvatarFallback(profile)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{profile.full_name || `@${profile.username}`}</p>
                            <Badge className="border-transparent bg-primary/12 text-primary">
                              {platformLabels[profile.platform]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/90">
                            <span>录入于 {formatMetaTime(profile.created_at)}</span>
                            <span>最近抓取 {formatMetaTime(profile.last_scraped_at)}</span>
                            <span>已抓取 {profile.post_count || 0} 条</span>
                          </div>
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
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{profile.creator_email || '内部录入'}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full"
                          onClick={() => openEditDialog(profile)}
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          修改标签
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setCreatePlatform(null);
            resetCreateTags();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" />
              选择标签后录入达人
            </DialogTitle>
            <DialogDescription>
              当前将录入 {createPlatform ? platformLabels[createPlatform] : '达人'} 主页：
              <span className="ml-1 break-all font-mono text-xs">{profileUrl.trim() || '未填写'}</span>
              <span className="mt-2 block text-xs text-muted-foreground">
                如果这是品牌方官方账号，请直接选择“品牌官方号”一级标签。
              </span>
            </DialogDescription>
          </DialogHeader>

          <ProfileTagFields
            benchmarkType={createBenchmarkType}
            cultureTags={createCultureTags}
            contentTags={createContentTags}
            onBenchmarkTypeChange={setCreateBenchmarkType}
            onCultureTagsChange={setCreateCultureTags}
            onContentTagsChange={setCreateContentTags}
            disabled={submitting}
            allowEmptyBenchmark
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateDialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="button" onClick={handleConfirmAddCreator} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '确认录入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingProfile)} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilLine className="h-4 w-4 text-primary" />
              修改达人标签
            </DialogTitle>
            <DialogDescription>
              {editingProfile ? `@${editingProfile.username}` : '当前达人'} 的标签会立即更新到关注列表与筛选中。
            </DialogDescription>
          </DialogHeader>

          <ProfileTagFields
            benchmarkType={editBenchmarkType}
            cultureTags={editCultureTags}
            contentTags={editContentTags}
            onBenchmarkTypeChange={setEditBenchmarkType}
            onCultureTagsChange={setEditCultureTags}
            onContentTagsChange={setEditContentTags}
            disabled={savingTags}
            allowEmptyBenchmark
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingProfile(null)}
              disabled={savingTags}
            >
              取消
            </Button>
            <Button type="button" onClick={handleSaveProfileTags} disabled={savingTags}>
              {savingTags ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存标签'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
