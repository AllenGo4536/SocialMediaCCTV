
import { NextRequest, NextResponse } from 'next/server';
import { apifyClient } from '@/lib/apify';
import { supabaseAdmin } from '@/lib/supabase';

type SupportedPlatform = 'instagram' | 'tiktok' | 'youtube';

interface TikTokEntity {
    name?: string;
}

interface DatasetItem {
    ownerUsername?: string;
    id?: string;
    shortCode?: string;
    type?: string;
    caption?: string;
    displayUrl?: string;
    url?: string;
    videoUrl?: string;
    videoViewCount?: number;
    videoPlayCount?: number;
    videoDuration?: number;
    likesCount?: number;
    commentsCount?: number;
    hashtags?: Array<string | TikTokEntity>;
    mentions?: Array<string | TikTokEntity>;
    isPinned?: boolean;
    isSponsored?: boolean;
    timestamp?: string;
    authorMeta?: { name?: string };
    input?: string;
    webVideoUrl?: string;
    isSlideshow?: boolean;
    text?: string;
    videoMeta?: {
        coverUrl?: string;
        originalCoverUrl?: string;
        duration?: number;
    };
    mediaUrls?: string[];
    playCount?: number;
    diggCount?: number;
    commentCount?: number;
    createTimeISO?: string;
    createTime?: number;
    title?: string;
    thumbnailUrl?: string;
    viewCount?: number;
    likes?: number;
    date?: string;
    channelName?: string;
    channelUrl?: string;
    fromYTUrl?: string;
    inputChannelUrl?: string;
}

function normalizeUsername(username: string) {
    return username.trim().replace(/^@/, '').toLowerCase();
}

function detectPlatform(item: DatasetItem, actorId: string | undefined): SupportedPlatform | null {
    if (actorId?.includes('streamers~youtube-scraper')) return 'youtube';
    if (actorId?.includes('clockworks~tiktok-scraper')) return 'tiktok';
    if (actorId?.includes('instagram')) return 'instagram';
    if (item.ownerUsername) return 'instagram';
    if (item.authorMeta?.name || item.webVideoUrl?.includes('tiktok.com')) return 'tiktok';
    if (item.channelUrl || item.fromYTUrl || item.inputChannelUrl) return 'youtube';
    return null;
}

function extractYoutubeUsernameFromUrl(input: string): string | null {
    try {
        const url = new URL(input);
        const host = url.hostname.toLowerCase();
        if (!host.includes('youtube.com') && !host.includes('youtu.be')) return null;

        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length === 0) return null;

        if (pathParts[0].startsWith('@')) {
            return pathParts[0].slice(1).toLowerCase();
        }
        if (
            (pathParts[0] === 'channel' || pathParts[0] === 'user' || pathParts[0] === 'c') &&
            pathParts[1]
        ) {
            return `${pathParts[0]}:${pathParts[1]}`.toLowerCase();
        }
        return pathParts.join('/').toLowerCase();
    } catch {
        return null;
    }
}

function extractUsername(platform: SupportedPlatform, item: DatasetItem): string | null {
    if (platform === 'instagram') {
        return item.ownerUsername ? normalizeUsername(item.ownerUsername) : null;
    }
    if (platform === 'tiktok') {
        if (item.authorMeta?.name) return normalizeUsername(item.authorMeta.name);
        if (item.input) return normalizeUsername(item.input);
        return null;
    }

    const youtubeCandidates = [item.channelUrl, item.fromYTUrl, item.inputChannelUrl].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
    );
    for (const candidate of youtubeCandidates) {
        const parsed = extractYoutubeUsernameFromUrl(candidate);
        if (parsed) return parsed;
    }

    return item.channelName ? item.channelName.trim().toLowerCase() : null;
}

function mapInstagramItem(item: DatasetItem, profileId: string) {
    return {
        platform: 'instagram',
        profile_id: profileId,
        external_id: item.id || '',
        short_code: item.shortCode || null,
        type: item.type || null,
        caption: item.caption || null,
        display_url: item.displayUrl || null,
        permalink: item.url || null,
        video_url: item.videoUrl || null,
        video_view_count: item.videoViewCount || 0,
        video_play_count: item.videoPlayCount || 0,
        video_duration: item.videoDuration || null,
        like_count: item.likesCount === -1 ? 0 : item.likesCount || 0,
        comment_count: item.commentsCount || 0,
        hashtags: (item.hashtags || []).filter((value): value is string => typeof value === 'string'),
        mentions: (item.mentions || []).filter((value): value is string => typeof value === 'string'),
        is_pinned: item.isPinned || false,
        is_sponsored: item.isSponsored || false,
        posted_at: item.timestamp || null,
        updated_at: new Date().toISOString()
    };
}

function mapTikTokItem(item: DatasetItem, profileId: string) {
    const hashtagNames = Array.isArray(item.hashtags)
        ? item.hashtags.map((tag) => (typeof tag === 'string' ? tag : tag?.name)).filter(Boolean)
        : [];
    const mentionNames = Array.isArray(item.mentions)
        ? item.mentions.map((mention) => (typeof mention === 'string' ? mention : mention?.name)).filter(Boolean)
        : [];

    return {
        platform: 'tiktok',
        profile_id: profileId,
        external_id: item.id || '',
        short_code: null,
        type: item.isSlideshow ? 'Sidecar' : 'Video',
        caption: item.text || '',
        display_url: item.videoMeta?.coverUrl || item.videoMeta?.originalCoverUrl || null,
        permalink: item.webVideoUrl || null,
        video_url: Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0 ? item.mediaUrls[0] : null,
        video_view_count: item.playCount || 0,
        video_play_count: item.playCount || 0,
        video_duration: item.videoMeta?.duration || null,
        like_count: item.diggCount || 0,
        comment_count: item.commentCount || 0,
        hashtags: hashtagNames,
        mentions: mentionNames,
        is_pinned: item.isPinned || false,
        is_sponsored: item.isSponsored || false,
        posted_at: item.createTimeISO || (item.createTime ? new Date(item.createTime * 1000).toISOString() : null),
        updated_at: new Date().toISOString()
    };
}

function parseYouTubeDateToIso(raw: string | undefined): string | null {
    if (!raw) return null;

    const directDate = new Date(raw);
    if (!Number.isNaN(directDate.getTime())) {
        return directDate.toISOString();
    }

    const match = raw.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
    if (!match) return null;

    const count = Number.parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const now = new Date();

    if (unit === 'minute') now.setMinutes(now.getMinutes() - count);
    else if (unit === 'hour') now.setHours(now.getHours() - count);
    else if (unit === 'day') now.setDate(now.getDate() - count);
    else if (unit === 'week') now.setDate(now.getDate() - count * 7);
    else if (unit === 'month') now.setMonth(now.getMonth() - count);
    else if (unit === 'year') now.setFullYear(now.getFullYear() - count);

    return now.toISOString();
}

function mapYoutubeItem(item: DatasetItem, profileId: string) {
    return {
        platform: 'youtube',
        profile_id: profileId,
        external_id: item.id || '',
        short_code: null,
        type: 'Video',
        caption: item.title || item.text || '',
        display_url: item.thumbnailUrl || null,
        permalink: item.url || null,
        video_url: null,
        video_view_count: item.viewCount || 0,
        video_play_count: item.viewCount || 0,
        video_duration: null,
        like_count: item.likes || 0,
        comment_count: item.commentsCount || 0,
        hashtags: [],
        mentions: [],
        is_pinned: false,
        is_sponsored: false,
        posted_at: parseYouTubeDateToIso(item.date),
        updated_at: new Date().toISOString()
    };
}

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
        const actorId: string | undefined = payload.resource?.actId;
        if (!defaultDatasetId) {
            return NextResponse.json({ error: 'No dataset ID found' }, { status: 400 });
        }

        const { items } = await apifyClient.dataset(defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            return NextResponse.json({ message: 'No items in dataset' }, { status: 200 });
        }

        const usernameBuckets: Record<SupportedPlatform, Set<string>> = {
            instagram: new Set<string>(),
            tiktok: new Set<string>(),
            youtube: new Set<string>(),
        };

        for (const item of items) {
            const platform = detectPlatform(item, actorId);
            if (!platform) continue;
            const username = extractUsername(platform, item);
            if (!username) continue;
            usernameBuckets[platform].add(username);
        }

        const profileMap = new Map<string, string>();

        if (usernameBuckets.instagram.size > 0) {
            const { data: instagramProfiles } = await supabaseAdmin
                .from('profiles')
                .select('id, username')
                .eq('platform', 'instagram')
                .in('username', [...usernameBuckets.instagram]);
            if (instagramProfiles) {
                instagramProfiles.forEach((profile) => {
                    profileMap.set(`instagram:${normalizeUsername(profile.username)}`, profile.id);
                });
            }
        }

        if (usernameBuckets.tiktok.size > 0) {
            const { data: tiktokProfiles } = await supabaseAdmin
                .from('profiles')
                .select('id, username')
                .eq('platform', 'tiktok')
                .in('username', [...usernameBuckets.tiktok]);
            if (tiktokProfiles) {
                tiktokProfiles.forEach((profile) => {
                    profileMap.set(`tiktok:${normalizeUsername(profile.username)}`, profile.id);
                });
            }
        }

        if (usernameBuckets.youtube.size > 0) {
            const { data: youtubeProfiles } = await supabaseAdmin
                .from('profiles')
                .select('id, username')
                .eq('platform', 'youtube')
                .in('username', [...usernameBuckets.youtube]);
            if (youtubeProfiles) {
                youtubeProfiles.forEach((profile) => {
                    profileMap.set(`youtube:${normalizeUsername(profile.username)}`, profile.id);
                });
            }
        }

        const postsToUpsert: Array<Record<string, unknown>> = [];

        for (const item of items) {
            const itemData = item as DatasetItem;
            const platform = detectPlatform(itemData, actorId);
            if (!platform) continue;
            if (!itemData.id) continue;
            const username = extractUsername(platform, itemData);
            if (!username) continue;

            const profileId = profileMap.get(`${platform}:${username}`);
            if (!profileId) continue;

            if (platform === 'instagram') {
                postsToUpsert.push(mapInstagramItem(itemData, profileId));
            } else if (platform === 'tiktok') {
                postsToUpsert.push(mapTikTokItem(itemData, profileId));
            } else {
                postsToUpsert.push(mapYoutubeItem(itemData, profileId));
            }
        }

        if (postsToUpsert.length > 0) {
            const { data: upsertedPosts, error } = await supabaseAdmin
                .from('posts')
                .upsert(postsToUpsert, { onConflict: 'platform,external_id' })
                .select('id, posted_at, like_count, comment_count, video_view_count, video_play_count');

            if (error) {
                console.error('Upsert error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            if (upsertedPosts && upsertedPosts.length > 0) {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

                const snapshotsToInsert = upsertedPosts
                    .filter(post => {
                        if (!post.posted_at) return false;
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
                    }
                }
            }
        }

        return NextResponse.json({ success: true, count: postsToUpsert.length });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Webhook processing error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
