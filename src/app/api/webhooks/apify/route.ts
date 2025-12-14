
import { NextRequest, NextResponse } from 'next/server';
import { apifyClient } from '@/lib/apify';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        // Verify event type
        const eventType = payload.eventType;
        if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
            // We only care about success
            return NextResponse.json({ message: 'Ignored non-success event' }, { status: 200 });
        }

        const { defaultDatasetId } = payload.resource;
        if (!defaultDatasetId) {
            return NextResponse.json({ error: 'No dataset ID found' }, { status: 400 });
        }

        // Fetch items from dataset
        const { items } = await apifyClient.dataset(defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            return NextResponse.json({ message: 'No items in dataset' }, { status: 200 });
        }

        // Prep cache for profiles to avoid N queries
        // Get all profiles first? Or just unique usernames from items?
        // Let's get unique usernames from items
        const usernames = [...new Set(items.map((item: any) => item.ownerUsername))];

        // Fetch profiles from DB
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, username')
            .in('username', usernames);

        const profileMap = new Map();
        if (profiles) {
            profiles.forEach(p => profileMap.set(p.username, p.id));
        }

        const postsToUpsert = [];

        for (const item of items) {
            const itemData = item as any;
            const ownerUsername = itemData.ownerUsername;
            const profileId = profileMap.get(ownerUsername);

            if (!profileId) {
                // Skip posts from untracked profiles (shouldn't happen if we scoped scrape correctly, 
                // but "Related Hashtag" scrape might bring noise if we used that mode)
                continue;
            }

            postsToUpsert.push({
                profile_id: profileId,
                external_id: itemData.id,
                short_code: itemData.shortCode,
                type: itemData.type, // 'Image', 'Video', 'Sidecar'
                caption: itemData.caption,
                display_url: itemData.displayUrl,
                permalink: itemData.url,

                video_url: itemData.videoUrl || null,
                video_view_count: itemData.videoViewCount || 0,
                video_play_count: itemData.videoPlayCount || 0,
                video_duration: itemData.videoDuration || null,

                like_count: itemData.likesCount === -1 ? 0 : itemData.likesCount,
                comment_count: itemData.commentsCount || 0,

                hashtags: itemData.hashtags || [],
                mentions: itemData.mentions || [],
                is_pinned: itemData.isPinned || false,
                is_sponsored: itemData.isSponsored || false,

                posted_at: itemData.timestamp,
                updated_at: new Date().toISOString()
            });
        }

        if (postsToUpsert.length > 0) {
            // Upsert posts and get the new/updated IDs
            const { data: upsertedPosts, error } = await supabaseAdmin
                .from('posts')
                .upsert(postsToUpsert, { onConflict: 'external_id' })
                .select('id, posted_at, like_count, comment_count, video_view_count, video_play_count');

            if (error) {
                console.error('Upsert error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            // --- Snapshot Logic ---
            if (upsertedPosts && upsertedPosts.length > 0) {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

                const snapshotsToInsert = upsertedPosts
                    .filter(post => {
                        // Filter: Only track metrics for posts posted within the last 30 days
                        const postedAt = new Date(post.posted_at);
                        return postedAt > thirtyDaysAgo;
                    })
                    .map(post => ({
                        post_id: post.id,
                        like_count: post.like_count,
                        comment_count: post.comment_count,
                        video_view_count: post.video_view_count,
                        video_play_count: post.video_play_count,
                        recorded_at: now.toISOString()
                    }));

                if (snapshotsToInsert.length > 0) {
                    const { error: snapshotError } = await supabaseAdmin
                        .from('post_snapshots')
                        .insert(snapshotsToInsert);

                    if (snapshotError) {
                        console.error('Snapshot insert error:', snapshotError);
                        // We don't fail the whole request if snapshot fails, but we log it
                    } else {
                        console.log(`Recorded ${snapshotsToInsert.length} snapshots`);
                    }
                }
            }
            // ----------------------
        }

        return NextResponse.json({ success: true, count: postsToUpsert.length });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
