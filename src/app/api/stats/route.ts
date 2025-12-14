import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Get total profiles count
        const { count: profileCount, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (profileError) throw profileError;

        // 2. Get posts count from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: postsCount, error: postsError } = await supabaseAdmin
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .gte('posted_at', sevenDaysAgo.toISOString());

        if (postsError) throw postsError;

        return NextResponse.json({
            profileCount: profileCount || 0,
            recentPostsCount: postsCount || 0
        });
    } catch (error: any) {
        console.error('Stats error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
