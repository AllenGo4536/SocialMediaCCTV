
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerInstagramScrape, triggerTikTokScrape, triggerYoutubeScrape } from '@/lib/apify';

export const maxDuration = 60; // Allow 60s for Vercel Function (triggers aren't long running, but iterating might take a sec)

// Protected by CRON_SECRET or just checking the Vercel header
// Vercel Cron sends `Authorization: Bearer undefined`? No.
// Vercel docs: Incoming requests have `Authorization` header with `CRON_SECRET`.
// Or we can use our `x-virax-secret` if we manually trigger.

export async function GET(req: NextRequest) {
    // Check auth
    const authHeader = req.headers.get('authorization');
    const viraxSecret = req.headers.get('x-virax-secret');

    const isValidCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isValidManual = process.env.VIRAX_SECRET_KEY && viraxSecret === process.env.VIRAX_SECRET_KEY;

    if (!isValidCron && !isValidManual) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('username, platform, profile_url');

        if (error) throw error;
        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ message: 'No profiles to update' });
        }

        const instagramUsernames = profiles
            .filter((profile) => profile.platform === 'instagram')
            .map((profile) => profile.username);
        const tiktokUsernames = profiles
            .filter((profile) => profile.platform === 'tiktok')
            .map((profile) => profile.username);
        const youtubeUrls = profiles
            .filter((profile) => profile.platform === 'youtube')
            .map((profile) => profile.profile_url)
            .filter((url): url is string => typeof url === 'string' && url.length > 0);

        const runs: Array<{ platform: 'instagram' | 'tiktok' | 'youtube'; runId: string }> = [];

        if (instagramUsernames.length > 0) {
            const run = await triggerInstagramScrape(instagramUsernames, 5);
            runs.push({ platform: 'instagram', runId: run.id });
        }
        if (tiktokUsernames.length > 0) {
            const run = await triggerTikTokScrape(tiktokUsernames, 5);
            runs.push({ platform: 'tiktok', runId: run.id });
        }
        if (youtubeUrls.length > 0) {
            const run = await triggerYoutubeScrape(youtubeUrls, 5);
            runs.push({ platform: 'youtube', runId: run.id });
        }

        return NextResponse.json({
            success: true,
            message: `Triggered scrape for ${profiles.length} profiles`,
            runs,
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
