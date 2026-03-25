
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerInstagramProfileDetailsScrape, triggerInstagramScrape, triggerTikTokScrape, triggerYoutubeScrape } from '@/lib/apify';
import { ingestSource } from '@/lib/ingest/service';
import { listActiveTrackedSources, markTrackedSourceChecked } from '@/lib/ingest/persistence';

export const maxDuration = 300;

const CRON_REQUESTED_BY = 'cron@virax.local';
const X_TRACKED_SOURCE_LIMIT = 10;
const X_TRACKED_SOURCE_CONCURRENCY = 3;

async function processTrackedSourcesInBatches<T, R>(
    items: T[],
    worker: (item: T) => Promise<R>
) {
    const results: R[] = [];

    for (let index = 0; index < items.length; index += X_TRACKED_SOURCE_CONCURRENCY) {
        const batch = items.slice(index, index + X_TRACKED_SOURCE_CONCURRENCY);
        const batchResults = await Promise.all(batch.map((item) => worker(item)));
        results.push(...batchResults);
    }

    return results;
}

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

        const profileList = profiles || [];
        const instagramUsernames = profileList
            .filter((profile) => profile.platform === 'instagram')
            .map((profile) => profile.username);
        const instagramProfileUrls = profileList
            .filter((profile) => profile.platform === 'instagram')
            .map((profile) => profile.profile_url)
            .filter((url): url is string => typeof url === 'string' && url.length > 0);
        const tiktokUsernames = profileList
            .filter((profile) => profile.platform === 'tiktok')
            .map((profile) => profile.username);
        const youtubeUrls = profileList
            .filter((profile) => profile.platform === 'youtube')
            .map((profile) => profile.profile_url)
            .filter((url): url is string => typeof url === 'string' && url.length > 0);
        const trackedSources = await listActiveTrackedSources();

        const runs: Array<{ platform: 'instagram' | 'tiktok' | 'youtube'; runId: string }> = [];

        if (instagramUsernames.length > 0) {
            const run = await triggerInstagramScrape(instagramUsernames, 5);
            runs.push({ platform: 'instagram', runId: run.id });
        }
        if (instagramProfileUrls.length > 0) {
            const run = await triggerInstagramProfileDetailsScrape(instagramProfileUrls);
            if (run) {
                runs.push({ platform: 'instagram', runId: run.id });
            }
        }
        if (tiktokUsernames.length > 0) {
            const run = await triggerTikTokScrape(tiktokUsernames, 5);
            runs.push({ platform: 'tiktok', runId: run.id });
        }
        if (youtubeUrls.length > 0) {
            const run = await triggerYoutubeScrape(youtubeUrls, 5);
            runs.push({ platform: 'youtube', runId: run.id });
        }

        const trackedSourceResults = await processTrackedSourcesInBatches(trackedSources, async (trackedSource) => {
            try {
                const result = await ingestSource({
                    mode: 'author_tracking',
                    authorHandle: trackedSource.handle,
                    authorUrl: trackedSource.author_url,
                    sourcePlatform: 'x',
                    requestedBy: CRON_REQUESTED_BY,
                    ingestMethod: 'auto_tracked',
                    sort: 'Latest',
                    maxItems: X_TRACKED_SOURCE_LIMIT,
                });

                if (result.mode === 'single_url') {
                    throw new Error('Unexpected single_url result for tracked source ingest.');
                }

                const latestItem = result.items[0];
                await markTrackedSourceChecked({
                    id: trackedSource.id,
                    displayName: latestItem?.sourceRecord.author_name || trackedSource.display_name,
                    latestHeadline: latestItem?.newsItem.title || trackedSource.latest_headline,
                    latestSourceRecordId: latestItem?.sourceRecord.id || trackedSource.latest_source_record_id,
                });

                return {
                    id: trackedSource.id,
                    handle: trackedSource.handle,
                    status: 'succeeded' as const,
                    totalPersisted: result.totalPersisted,
                };
            } catch (error: unknown) {
                await markTrackedSourceChecked({ id: trackedSource.id });

                return {
                    id: trackedSource.id,
                    handle: trackedSource.handle,
                    status: 'failed' as const,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });

        if (runs.length === 0 && trackedSourceResults.length === 0) {
            return NextResponse.json({ message: 'No profiles or tracked sources to update' });
        }

        return NextResponse.json({
            success: true,
            message: `Triggered scheduled updates for ${profileList.length} profiles and ${trackedSources.length} X tracked sources`,
            runs,
            trackedSources: {
                total: trackedSources.length,
                succeeded: trackedSourceResults.filter((item) => item.status === 'succeeded').length,
                failed: trackedSourceResults.filter((item) => item.status === 'failed').length,
                results: trackedSourceResults,
            },
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
