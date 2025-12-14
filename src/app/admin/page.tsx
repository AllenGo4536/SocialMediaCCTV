
"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile } from '@/types';
import { Trash2, Loader2, ArrowLeft, CheckCircle2, Search } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { SiteHeader } from '@/components/layout/site-header';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function AdminPage() {
    // ... (keep state)
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/profiles', {
                headers: {
                    'x-virax-secret': localStorage.getItem('virax_secret') || ''
                }
            });
            if (!res.ok) throw new Error('Failed to fetch profiles');
            const data = await res.json();
            setProfiles(data);
        } catch (err) {
            toast.error("Failed to load profiles");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleDelete = async (id: string, username: string) => {
        try {
            const res = await fetch(`/api/profiles/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-virax-secret': localStorage.getItem('virax_secret') || ''
                }
            });

            if (!res.ok) throw new Error('Failed to delete');

            toast.success(`Removed @${username}`);
            setProfiles(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    const filteredProfiles = profiles.filter(profile =>
        profile.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background font-sans">
            <SiteHeader />

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Stats Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">博主管理</h1>
                    <p className="text-muted-foreground">
                        平台当前共收录 <span className="text-primary font-bold text-lg mx-1">{profiles.length}</span> 位博主
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索博主..."
                        className="pl-9 h-10 bg-card border-border"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : filteredProfiles.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-border rounded-lg">
                        {searchQuery ? (
                            <p className="text-muted-foreground">未找到匹配的博主。</p>
                        ) : (
                            <>
                                <p className="text-muted-foreground">暂无已关注的博主。</p>
                                <Link href="/">
                                    <Button variant="link" className="mt-2">去首页添加</Button>
                                </Link>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredProfiles.map(profile => (
                            <div key={profile.id} className="flex items-center justify-between p-4 hover:bg-card/50 rounded-lg transition-colors group">
                                <div className="flex items-center gap-4 min-w-0">
                                    {/* Status Indicator */}
                                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" title="活跃"></div>

                                    <Avatar className="h-10 w-10 border border-border">
                                        <AvatarImage src={profile.avatar_url} />
                                        <AvatarFallback>{profile.username[0].toUpperCase()}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-foreground">{profile.username}</span>
                                        {/* Verified Badge logic if we had it, hardcoded style for now based on wireframe */}
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hidden sm:inline-block">
                                            已认证
                                        </span>
                                    </div>
                                </div>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="hidden sm:inline">删除</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>确认删除博主 @{profile.username}？</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                此操作将永久移除该博主。
                                                <br /><br />
                                                <span className="text-destructive font-semibold">注意：所有相关的历史帖子数据都将被清空，且无法恢复。</span>
                                                <br />
                                                如果您只想暂停监控，请不要执行此操作。
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>取消</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(profile.id, profile.username)}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                确认删除
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
