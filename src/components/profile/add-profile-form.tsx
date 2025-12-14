
"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';

interface AddProfileFormProps {
    onSuccess: () => void;
    secretKey: string;
    className?: string;
}

export function AddProfileForm({ onSuccess, className }: AddProfileFormProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, openAuthModal } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            openAuthModal();
            return;
        }
        if (!url) return;

        // ... logic ...
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
            const secret = localStorage.getItem('virax_secret');
            if (!secret) {
                const input = prompt("请输入管理密钥以添加博主:", "");
                if (!input) {
                    setLoading(false);
                    return;
                }
                localStorage.setItem('virax_secret', input);
            }

            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-virax-secret': localStorage.getItem('virax_secret') || ''
                },
                body: JSON.stringify({ username })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to add profile');
            }

            toast.success(`博主 @${username} 添加成功，正在抓取数据...`);
            setUrl('');
            onSuccess();
        } catch (err: any) {
            toast.error(err.message);
            if (err.message === 'Unauthorized') {
                localStorage.removeItem('virax_secret');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={cn("flex flex-col sm:flex-row gap-4 w-full", className)}>
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>添加 (+)</span>}
            </Button>
        </form>
    );
}
