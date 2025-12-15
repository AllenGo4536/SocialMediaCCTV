"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import confetti from 'canvas-confetti';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface AddProfileFormProps {
    onSuccess: () => void;
    className?: string;
}

export function AddProfileForm({ onSuccess, className }: AddProfileFormProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const { user, session, openAuthModal } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            openAuthModal();
            return;
        }
        if (!url) return;

        // Simple validation to ensure it looks like a username or url if needed
        // but existing logic handles extraction well.
        let username = url.trim();
        if (username.includes('instagram.com/')) {
            const parts = username.split('instagram.com/');
            const path = parts[1].split(/[/?]/)[0];
            username = path;
        }

        if (!username) {
            toast.error("Invalid input");
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
                body: JSON.stringify({ username })
            });


            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to add profile');
            }

            // Success flow
            setUrl(''); // Clear input immediately

            // 1. Confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            // 2. Show Modal
            setShowSuccessModal(true);

            // 3. Auto close after 2s
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 2000);

            onSuccess();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            toast.error(errorMessage);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("w-full", className)}>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 w-full">
                <div className="flex-grow relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                        <span className="text-sm font-mono opacity-50">https://www.instagram.com/</span>
                    </div>
                    <Input
                        className="pl-[14.5rem] bg-background border-border h-12 font-mono text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-primary/50 rounded-lg border-l-2 border-l-primary/50"
                        placeholder="username"
                        value={url}
                        onChange={e => {
                            // Remove prefix if user pasted it
                            setUrl(e.target.value);
                        }}
                        disabled={loading}
                    />
                </div>
                <Button
                    type="submit"
                    disabled={loading}
                    size="lg"
                    className="h-12 px-8 font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>添加博主</span>}
                </Button>
            </form>

            <div className="mt-6 p-4 bg-secondary/30 rounded-lg border border-border/50">
                <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full inline-block"></span>
                    使用说明
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>
                        实际输入：profileURL最后的用户ID，例如 <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded text-foreground">https://www.instagram.com/higgsifield.ai</span>，输入higgsfiled.ai即可
                    </li>
                    <li>
                        添加博主后，系统会自动抓取最新数据，请等待约 1 分钟
                    </li>
                    <li>
                        首次添加自动获取最新 5 条视频，之后每日 9:00 AM 自动更新，支持最近发布 5 条帖子每日更新数据
                    </li>
                </ul>
            </div>

            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-md text-center">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center justify-center gap-2">
                            <PartyPopper className="w-8 h-8 text-primary animate-bounce" />
                            添加成功
                        </DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            博主已成功添加到监控列表！
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    );
}
