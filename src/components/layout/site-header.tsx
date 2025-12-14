"use client";

import Image from 'next/image';
import Link from 'next/link';
import { UserNav } from '@/components/auth/user-nav';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
    const pathname = usePathname();

    const routes = [
        {
            href: '/',
            label: '首页',
            active: pathname === '/',
        },
        {
            href: '/admin',
            label: '博主管理中心',
            active: pathname === '/admin',
        }
    ];

    return (
        <header className="border-b border-border bg-background py-4 sticky top-0 z-10 w-full mb-8">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="flex items-center gap-8">
                    {/* Branding */}
                    <div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <Link href="/" className="cursor-pointer">
                                    <Image src="/logo.png" alt="ViraX" width={120} height={40} className="h-8 w-auto" priority />
                                </Link>
                                <span className="text-lg font-semibold text-muted-foreground/80 border-l border-border pl-3 tracking-wide hidden sm:inline-block">
                                    内部工具
                                </span>
                            </div>
                            <p className="text-muted-foreground text-xs font-medium tracking-wider pl-1 uppercase opacity-70 hidden sm:block">
                                社媒博主定向监控
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-6">
                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {routes.map((route) => (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "text-sm font-medium transition-colors px-4 py-2 rounded-md hover:bg-accent hover:text-accent-foreground",
                                    route.active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                {route.label}
                            </Link>
                        ))}
                    </nav>
                    <UserNav />
                </div>
            </div>
        </header>
    );
}
