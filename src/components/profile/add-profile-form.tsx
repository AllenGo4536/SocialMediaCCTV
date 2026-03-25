"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import confetti from 'canvas-confetti';
import { PLATFORM_OPTIONS } from '@/lib/taxonomy';
import type { BenchmarkTag, ContentTag, CultureTag, Platform } from '@/lib/taxonomy';
import { ProfileTagFields } from '@/components/profile/profile-tag-fields';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface AddProfileFormProps {
    onSuccess: () => void;
    className?: string;
}

export function AddProfileForm({ onSuccess, className }: AddProfileFormProps) {
    const [open, setOpen] = useState(false);
    const [platform, setPlatform] = useState<Platform>('instagram');
    const [username, setUsername] = useState('');
    const [profileUrl, setProfileUrl] = useState('');
    const [benchmarkType, setBenchmarkType] = useState<BenchmarkTag | ''>('');
    const [cultureTags, setCultureTags] = useState<CultureTag[]>([]);
    const [contentTags, setContentTags] = useState<ContentTag[]>([]);
    const [loading, setLoading] = useState(false);
    const { user, session, openAuthModal } = useAuth();

    const canSubmit =
        !loading &&
        username.trim().length > 0 &&
        profileUrl.trim().length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            openAuthModal();
            return;
        }
        if (!username.trim()) {
            toast.error('请输入用户名');
            return;
        }
        if (!profileUrl.trim()) {
            toast.error('请输入主页链接');
            return;
        }

        setLoading(true);
        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    platform,
                    input: profileUrl.trim(),
                    manualUsername: username.trim(),
                    ...(benchmarkType ? { benchmarkType } : {}),
                    cultureTags,
                    contentTags,
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to add profile');
            }

            setUsername('');
            setProfileUrl('');
            setBenchmarkType('');
            setCultureTags([]);
            setContentTags([]);

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            toast.success('达人添加成功，正在抓取最新内容');
            setOpen(false);
            onSuccess();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const inputPlaceholder =
        platform === 'instagram'
            ? '例如 higgsifield.ai'
            : platform === 'tiktok'
                ? '例如 shaiie_foeva'
                : '例如 @channel_handle';

    const urlPlaceholder =
        platform === 'instagram'
            ? 'https://www.instagram.com/username'
            : platform === 'tiktok'
                ? 'https://www.tiktok.com/@username'
                : 'https://www.youtube.com/@handle';

    return (
        <div className={cn("w-full", className)}>
            <Dialog open={open} onOpenChange={setOpen}>
                <Button
                    size="lg"
                    className="h-12 px-8 font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all"
                    onClick={() => {
                        if (!user) {
                            openAuthModal();
                            return;
                        }
                        setOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    添加达人
                </Button>

                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>添加达人</DialogTitle>
                        <DialogDescription>
                            请选择平台并填写用户名、主页链接与标签。品牌官方账号请打上“品牌官方号”一级标签。YouTube 仅支持频道主页链接；如果不选标签，保存后会自动归类为“未分类”。
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 w-full">
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                {PLATFORM_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        disabled={loading}
                                        className={`flex-1 h-10 sm:h-11 rounded-lg text-sm font-medium transition-all border cursor-pointer ${platform === option.value
                                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                            : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        onClick={() => setPlatform(option.value)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <Input
                                className="h-10 sm:h-11 bg-background border-border font-mono text-sm text-foreground placeholder:text-muted-foreground/40"
                                placeholder={inputPlaceholder}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                            />
                            <Input
                                className="h-10 sm:h-11 bg-background border-border font-mono text-sm text-foreground placeholder:text-muted-foreground/40"
                                placeholder={urlPlaceholder}
                                value={profileUrl}
                                onChange={(e) => setProfileUrl(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <ProfileTagFields
                            benchmarkType={benchmarkType}
                            cultureTags={cultureTags}
                            contentTags={contentTags}
                            onBenchmarkTypeChange={setBenchmarkType}
                            onCultureTagsChange={setCultureTags}
                            onContentTagsChange={setContentTags}
                            disabled={loading}
                            allowEmptyBenchmark
                        />

                        <details className="group">
                            <summary className="p-3 sm:p-4 bg-secondary/30 rounded-lg border border-border/50 cursor-pointer list-none flex items-center gap-2">
                                <span className="w-1 h-4 bg-primary rounded-full inline-block"></span>
                                <span className="text-sm font-semibold text-primary">填写说明</span>
                                <span className="ml-auto text-xs text-muted-foreground group-open:hidden">展开</span>
                                <span className="ml-auto text-xs text-muted-foreground hidden group-open:inline">收起</span>
                            </summary>
                            <div className="px-3 sm:px-4 pb-3 pt-2">
                                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                                    <li>用户名与主页链接都需要填写。</li>
                                    <li>如果录入的是品牌方官方账号，请选择“品牌官方号”一级标签。</li>
                                    <li>YouTube 仅支持频道页（如 <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded text-foreground">/ @handle</span>、<span className="font-mono text-xs bg-muted px-1 py-0.5 rounded text-foreground">/channel/xxx</span>）。</li>
                                    <li>标签可以不选；未选择时系统会自动归类为“未分类”。</li>
                                    <li>添加后系统会尝试抓取最新 5 条内容，通常约 1 分钟内可见。</li>
                                </ul>
                            </div>
                        </details>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                            >
                                取消
                            </Button>
                            <Button
                                type="submit"
                                disabled={!canSubmit}
                                className="min-w-[120px]"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '确认添加'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >
        </div >
    );
}
