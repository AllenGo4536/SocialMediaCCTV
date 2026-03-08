"use client";

import { Dispatch, SetStateAction, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import confetti from 'canvas-confetti';
import type { Platform } from '@/lib/taxonomy';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";

interface AddProfileFormProps {
    onSuccess: () => void;
    className?: string;
}

const platformOptions: Array<{ value: Platform; label: string }> = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
];

const cultureTagOptions = [
    { value: 'culture_me', label: '中东' },
    { value: 'culture_west', label: '欧美' },
];

const contentTagOptions = [
    { value: 'style_performance_camera', label: '穿搭/唱跳/运镜' },
    { value: 'pov', label: 'POV' },
    { value: 'daily_life', label: '日常记录' },
    { value: 'asmr', label: 'ASMR' },
    { value: 'virtual_idol', label: '虚拟偶像' },
];

export function AddProfileForm({ onSuccess, className }: AddProfileFormProps) {
    const [open, setOpen] = useState(false);
    const [platform, setPlatform] = useState<Platform>('instagram');
    const [username, setUsername] = useState('');
    const [profileUrl, setProfileUrl] = useState('');
    const [benchmarkType, setBenchmarkType] = useState<'ip_benchmark' | 'aesthetic_benchmark' | ''>('');
    const [cultureTags, setCultureTags] = useState<string[]>([]);
    const [contentTags, setContentTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { user, session, openAuthModal } = useAuth();

    const isIpBenchmark = benchmarkType === 'ip_benchmark';
    const canSubmit =
        !loading &&
        username.trim().length > 0 &&
        profileUrl.trim().length > 0 &&
        benchmarkType !== '';

    const toggleArrayItem = (
        array: string[],
        value: string,
        setter: Dispatch<SetStateAction<string[]>>
    ) => {
        if (array.includes(value)) {
            setter(array.filter((item) => item !== value));
            return;
        }
        setter([...array, value]);
    };

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
        if (!benchmarkType) {
            toast.error('请选择对标类型');
            return;
        }
        if (benchmarkType === 'aesthetic_benchmark' && (cultureTags.length > 0 || contentTags.length > 0)) {
            toast.error('美学对标不支持文化/内容类型子标签');
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
                    benchmarkType,
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
                <DialogTrigger asChild>
                    <Button
                        size="lg"
                        className="h-12 px-8 font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        添加达人
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>添加达人</DialogTitle>
                        <DialogDescription>
                            请选择平台并填写用户名、主页链接与标签。YouTube 仅支持频道主页链接。标签信息未完整时不可提交。
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select
                                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value as Platform)}
                                disabled={loading}
                            >
                                {platformOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <Input
                                className="h-11 bg-background border-border font-mono text-foreground placeholder:text-muted-foreground/40"
                                placeholder={inputPlaceholder}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                            />
                            <Input
                                className="h-11 bg-background border-border font-mono text-foreground placeholder:text-muted-foreground/40"
                                placeholder={urlPlaceholder}
                                value={profileUrl}
                                onChange={(e) => setProfileUrl(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="p-4 border border-border rounded-lg bg-secondary/20 space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-semibold">对标类型（必选）</p>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="benchmark-type"
                                            value="ip_benchmark"
                                            checked={benchmarkType === 'ip_benchmark'}
                                            onChange={() => setBenchmarkType('ip_benchmark')}
                                            disabled={loading}
                                        />
                                        IP对标
                                    </label>
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="benchmark-type"
                                            value="aesthetic_benchmark"
                                            checked={benchmarkType === 'aesthetic_benchmark'}
                                            onChange={() => {
                                                setBenchmarkType('aesthetic_benchmark');
                                                setCultureTags([]);
                                                setContentTags([]);
                                            }}
                                            disabled={loading}
                                        />
                                        美学对标
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className={cn("text-sm font-semibold", !isIpBenchmark && "text-muted-foreground")}>
                                    文化（仅 IP 对标）
                                </p>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    {cultureTagOptions.map((option) => (
                                        <label key={option.value} className="inline-flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={cultureTags.includes(option.value)}
                                                onChange={() => toggleArrayItem(cultureTags, option.value, setCultureTags)}
                                                disabled={loading || !isIpBenchmark}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className={cn("text-sm font-semibold", !isIpBenchmark && "text-muted-foreground")}>
                                    内容类型（仅 IP 对标，可多选）
                                </p>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    {contentTagOptions.map((option) => (
                                        <label key={option.value} className="inline-flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={contentTags.includes(option.value)}
                                                onChange={() => toggleArrayItem(contentTags, option.value, setContentTags)}
                                                disabled={loading || !isIpBenchmark}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-secondary/30 rounded-lg border border-border/50">
                            <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                <span className="w-1 h-4 bg-primary rounded-full inline-block"></span>
                                填写说明
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                                <li>用户名与主页链接都需要填写。</li>
                                <li>YouTube 仅支持频道页（如 <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded text-foreground">/ @handle</span>、<span className="font-mono text-xs bg-muted px-1 py-0.5 rounded text-foreground">/channel/xxx</span>）。</li>
                                <li>对标类型为必选；选择“美学对标”后不会显示子标签。</li>
                                <li>添加后系统会尝试抓取最新 5 条内容，通常约 1 分钟内可见。</li>
                            </ul>
                        </div>

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
            </Dialog>
        </div>
    );
}
