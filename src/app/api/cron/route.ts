
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerInstagramScrape } from '@/lib/apify';

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
        // 1. Get all active usernames
        const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('username');

        if (error) throw error;
        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ message: 'No profiles to update' });
        }

        const usernames = profiles.map(p => p.username);

        // 2. Trigger Apify
        // Apify Scraper can take a list of usernames.
        // We should batch them if there are too many? 
        // The scraper docs say "Add one or more...".
        // 100 usernames might be fine.
        // If we have thousands, we need batching. V1 assumes "Top influencers", maybe < 50.

        // "Daily refresh" -> get latest posts.
        // Limit to fewer posts per profile to save credits? 
        // User said "Every 24h refresh". 
        // Let's scrape 5-10 latest posts per profile to catch up.

        const run = await triggerInstagramScrape(usernames, 5);

        return NextResponse.json({
            success: true,
            message: `Triggered scrape for ${usernames.length} profiles`,
            runId: run.id
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
