"use client";

import { useEffect, useState } from 'react';
import { Users, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStatsProps {
    className?: string;
    refreshKey?: number; // Prop to trigger refetch
}

export function DashboardStats({ className, refreshKey }: DashboardStatsProps) {
    const [stats, setStats] = useState<{ profileCount: number; recentPostsCount: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // setLoading(true); // Don't flash loading on refresh? Maybe better to show spinner?
                // Let's keep it subtle for updates
                const res = await fetch('/api/stats');
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [refreshKey]);

    return (
        <div className={cn("grid grid-rows-2 gap-4 h-full", className)}>
            {/* Stat Card 1: Total Profiles */}
            <div className="bg-secondary/10 border border-primary/20 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">平台收录博主</p>
                        {loading ? (
                            <Skeleton className="h-8 w-16 mt-1" />
                        ) : (
                            <h3 className="text-3xl font-bold tracking-tight text-foreground">{stats?.profileCount || 0}</h3>
                        )}
                    </div>
                </div>
            </div>

            {/* Stat Card 2: Recent Posts */}
            <div className="bg-secondary/10 border border-orange-500/20 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500">
                        <Flame className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">近7天更新帖子</p>
                        {loading ? (
                            <Skeleton className="h-8 w-16 mt-1" />
                        ) : (
                            <h3 className="text-3xl font-bold tracking-tight text-foreground">{stats?.recentPostsCount || 0}</h3>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
