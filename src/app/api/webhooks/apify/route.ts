
import { NextRequest, NextResponse } from 'next/server';
import {
    apifyClient,
    INSTAGRAM_PROFILE_DETAILS_ACTOR_ID,
    INSTAGRAM_SCRAPER_ACTOR_ID,
    TIKTOK_SCRAPER_ACTOR_ID,
    YOUTUBE_SCRAPER_ACTOR_ID,
} from '@/lib/apify';
import { syncProfileAiSignals } from '@/lib/ai-profile-sync';
import { supabaseAdmin } from '@/lib/supabase';

type SupportedPlatform = 'instagram' | 'tiktok' | 'youtube';

interface TikTokEntity {
    name?: string;
}

interface TikTokAuthorMeta {
    id?: string;
    name?: string;
    nickName?: string;
    verified?: boolean;
    profileUrl?: string;
    avatar?: string;
    originalAvatarUrl?: string;
}

interface DatasetItem {
    ownerUsername?: string;
    ownerFullName?: string;
    ownerProfilePicUrl?: string;
    ownerId?: string;
    ownerIsVerified?: boolean;
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
    authorMeta?: TikTokAuthorMeta;
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
    username?: string;
    fullName?: string;
    biography?: string;
    externalUrl?: string;
    externalUrls?: Array<{
        title?: string;
        url?: string;
        link_type?: string;
    }>;
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
    private?: boolean;
    verified?: boolean;
    isBusinessAccount?: boolean;
    businessCategoryName?: string;
    profilePicUrl?: string;
    profilePicUrlHD?: string;
    hasChannel?: boolean;
    highlightReelCount?: number;
    igtvVideoCount?: number;
    thumbnailUrl?: string;
    viewCount?: number;
    likes?: number;
    date?: string;
    channelName?: string;
    channelUrl?: string;
    channelAvatarUrl?: string;
    channelThumbnailUrl?: string;
    isChannelVerified?: boolean;
    fromYTUrl?: string;
    inputChannelUrl?: string;
}

interface ProfileMetadataUpdate {
    external_id?: string;
    full_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
    profile_url?: string;
    biography?: string;
    external_url?: string;
    followers_count?: number;
    follows_count?: number;
    profile_posts_count?: number;
    is_private?: boolean;
    is_business_account?: boolean;
    business_category_name?: string;
    profile_scraped_at?: string;
}

interface ProfileSnapshotInsert {
    profile_id: string;
    platform: SupportedPlatform;
    followers_count?: number;
    follows_count?: number;
    profile_posts_count?: number;
    recorded_at: string;
}

function normalizeUsername(username: string) {
    return username.trim().replace(/^@/, '').toLowerCase();
}

function cleanString(value: string | undefined | null) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed || undefined;
}

function mergeProfileMetadata(
    current: ProfileMetadataUpdate | undefined,
    incoming: ProfileMetadataUpdate
) {
    const next: ProfileMetadataUpdate = current ? { ...current } : {};

    if (incoming.external_id) next.external_id = incoming.external_id;
    if (incoming.full_name) next.full_name = incoming.full_name;
    if (incoming.avatar_url) next.avatar_url = incoming.avatar_url;
    if (typeof incoming.is_verified === 'boolean') next.is_verified = incoming.is_verified;
    if (incoming.profile_url) next.profile_url = incoming.profile_url;
    if (incoming.biography) next.biography = incoming.biography;
    if (incoming.external_url) next.external_url = incoming.external_url;
    if (typeof incoming.followers_count === 'number') next.followers_count = incoming.followers_count;
    if (typeof incoming.follows_count === 'number') next.follows_count = incoming.follows_count;
    if (typeof incoming.profile_posts_count === 'number') next.profile_posts_count = incoming.profile_posts_count;
    if (typeof incoming.is_private === 'boolean') next.is_private = incoming.is_private;
    if (typeof incoming.is_business_account === 'boolean') next.is_business_account = incoming.is_business_account;
    if (incoming.business_category_name) next.business_category_name = incoming.business_category_name;
    if (incoming.profile_scraped_at) next.profile_scraped_at = incoming.profile_scraped_at;

    return next;
}

function isInstagramProfileDetailsItem(item: DatasetItem) {
    return Boolean(
        item.username &&
        (typeof item.biography === 'string'
            || typeof item.followersCount === 'number'
            || typeof item.profilePicUrl === 'string'
            || typeof item.profilePicUrlHD === 'string'
            || typeof item.fullName === 'string')
    );
}

function matchesActorId(actorId: string | undefined, targetActorId: string) {
    if (!actorId) return false;

    const normalizedActorId = actorId.trim();
    const apifyStyleActorId = targetActorId.replace('/', '~');

    return normalizedActorId === targetActorId
        || normalizedActorId === apifyStyleActorId
        || normalizedActorId.includes(targetActorId)
        || normalizedActorId.includes(apifyStyleActorId);
}

function extractInstagramProfileMetadata(item: DatasetItem): ProfileMetadataUpdate {
    const username = cleanString(item.ownerUsername);

    return {
        external_id: cleanString(item.ownerId),
        full_name: cleanString(item.ownerFullName),
        avatar_url: cleanString(item.ownerProfilePicUrl),
        is_verified: typeof item.ownerIsVerified === 'boolean' ? item.ownerIsVerified : undefined,
        profile_url: username ? `https://www.instagram.com/${normalizeUsername(username)}/` : undefined,
    };
}

function extractInstagramProfileDetailsMetadata(item: DatasetItem): ProfileMetadataUpdate {
    const username = cleanString(item.username);

    return {
        external_id: cleanString(item.id),
        full_name: cleanString(item.fullName),
        avatar_url: cleanString(item.profilePicUrlHD) || cleanString(item.profilePicUrl),
        is_verified: typeof item.verified === 'boolean' ? item.verified : undefined,
        profile_url: cleanString(item.url) || (username ? `https://www.instagram.com/${normalizeUsername(username)}/` : undefined),
        biography: cleanString(item.biography),
        external_url: cleanString(item.externalUrl),
        followers_count: typeof item.followersCount === 'number' ? item.followersCount : undefined,
        follows_count: typeof item.followsCount === 'number' ? item.followsCount : undefined,
        profile_posts_count: typeof item.postsCount === 'number' ? item.postsCount : undefined,
        is_private: typeof item.private === 'boolean' ? item.private : undefined,
        is_business_account: typeof item.isBusinessAccount === 'boolean' ? item.isBusinessAccount : undefined,
        business_category_name: cleanString(item.businessCategoryName),
        profile_scraped_at: new Date().toISOString(),
    };
}

function extractTikTokProfileMetadata(item: DatasetItem): ProfileMetadataUpdate {
    const authorMeta = item.authorMeta;

    return {
        external_id: cleanString(authorMeta?.id),
        full_name: cleanString(authorMeta?.nickName),
        avatar_url: cleanString(authorMeta?.originalAvatarUrl) || cleanString(authorMeta?.avatar),
        is_verified: typeof authorMeta?.verified === 'boolean' ? authorMeta.verified : undefined,
        profile_url: cleanString(authorMeta?.profileUrl),
    };
}

function extractYouTubeProfileMetadata(item: DatasetItem): ProfileMetadataUpdate {
    return {
        full_name: cleanString(item.channelName),
        avatar_url: cleanString(item.channelAvatarUrl) || cleanString(item.channelThumbnailUrl),
        is_verified: typeof item.isChannelVerified === 'boolean' ? item.isChannelVerified : undefined,
        profile_url: cleanString(item.channelUrl) || cleanString(item.fromYTUrl) || cleanString(item.inputChannelUrl),
    };
}

function detectPlatform(item: DatasetItem, actorId: string | undefined): SupportedPlatform | null {
    if (matchesActorId(actorId, YOUTUBE_SCRAPER_ACTOR_ID)) return 'youtube';
    if (matchesActorId(actorId, TIKTOK_SCRAPER_ACTOR_ID)) return 'tiktok';
    if (matchesActorId(actorId, INSTAGRAM_SCRAPER_ACTOR_ID)) return 'instagram';
    if (matchesActorId(actorId, INSTAGRAM_PROFILE_DETAILS_ACTOR_ID)) return 'instagram';
    if (item.ownerUsername) return 'instagram';
    if (isInstagramProfileDetailsItem(item)) return 'instagram';
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

function extractYoutubeIdentifierFromUrl(input: string): string | null {
    try {
        const url = new URL(input);
        const host = url.hostname.toLowerCase();
        if (!host.includes('youtube.com') && !host.includes('youtu.be')) return null;

        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length === 0) return null;

        if (pathParts[0].startsWith('@')) {
            return `handle:${pathParts[0].slice(1).toLowerCase()}`;
        }

        if (
            (pathParts[0] === 'channel' || pathParts[0] === 'user' || pathParts[0] === 'c') &&
            pathParts[1]
        ) {
            return `${pathParts[0]}:${pathParts[1].toLowerCase()}`;
        }

        return null;
    } catch {
        return null;
    }
}

function extractUsername(platform: SupportedPlatform, item: DatasetItem): string | null {
    if (platform === 'instagram') {
        if (item.username) return normalizeUsername(item.username);
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

    const normalized = raw.trim();
    const cleanedEnglish = normalized.replace(/^(streamed|premiered)\s+/i, '');
    const cleanedDate = new Date(cleanedEnglish);
    if (!Number.isNaN(cleanedDate.getTime())) {
        return cleanedDate.toISOString();
    }

    const now = new Date();
    const applyRelativeOffset = (count: number, unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year') => {
        const date = new Date(now);
        if (unit === 'minute') date.setMinutes(date.getMinutes() - count);
        else if (unit === 'hour') date.setHours(date.getHours() - count);
        else if (unit === 'day') date.setDate(date.getDate() - count);
        else if (unit === 'week') date.setDate(date.getDate() - count * 7);
        else if (unit === 'month') date.setMonth(date.getMonth() - count);
        else if (unit === 'year') date.setFullYear(date.getFullYear() - count);
        return date.toISOString();
    };

    const englishMatch = normalized.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
    if (englishMatch) {
        const count = Number.parseInt(englishMatch[1], 10);
        const unit = englishMatch[2].toLowerCase() as 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
        return applyRelativeOffset(count, unit);
    }

    const chineseMatch = normalized.match(/(\d+)\s*(分钟|小时|天|周|个月|月|年)前/);
    if (chineseMatch) {
        const count = Number.parseInt(chineseMatch[1], 10);
        const rawUnit = chineseMatch[2];
        if (rawUnit === '分钟') return applyRelativeOffset(count, 'minute');
        if (rawUnit === '小时') return applyRelativeOffset(count, 'hour');
        if (rawUnit === '天') return applyRelativeOffset(count, 'day');
        if (rawUnit === '周') return applyRelativeOffset(count, 'week');
        if (rawUnit === '个月' || rawUnit === '月') return applyRelativeOffset(count, 'month');
        if (rawUnit === '年') return applyRelativeOffset(count, 'year');
    }

    return null;
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

function buildYoutubeProfileLookupKeys(profile: { username: string; profile_url?: string | null }) {
    const keys = new Set<string>();
    const normalizedUsername = normalizeUsername(profile.username);
    keys.add(`youtube:username:${normalizedUsername}`);

    if (normalizedUsername.startsWith('channel:')) {
        keys.add(`youtube:url:${normalizedUsername}`);
    } else if (normalizedUsername.startsWith('user:')) {
        keys.add(`youtube:url:${normalizedUsername}`);
    } else if (normalizedUsername.startsWith('c:')) {
        keys.add(`youtube:url:${normalizedUsername}`);
    } else {
        keys.add(`youtube:url:handle:${normalizedUsername}`);
    }

    if (profile.profile_url) {
        const urlIdentifier = extractYoutubeIdentifierFromUrl(profile.profile_url);
        if (urlIdentifier) {
            keys.add(`youtube:url:${urlIdentifier}`);
        }
    }

    return [...keys];
}

function buildYoutubeItemLookupKeys(item: DatasetItem, extractedUsername: string | null) {
    const keys = new Set<string>();

    if (extractedUsername) {
        const normalized = normalizeUsername(extractedUsername);
        keys.add(`youtube:username:${normalized}`);
        if (normalized.startsWith('channel:') || normalized.startsWith('user:') || normalized.startsWith('c:')) {
            keys.add(`youtube:url:${normalized}`);
        } else {
            keys.add(`youtube:url:handle:${normalized}`);
        }
    }

    const youtubeCandidates = [item.channelUrl, item.fromYTUrl, item.inputChannelUrl].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
    );
    for (const candidate of youtubeCandidates) {
        const identifier = extractYoutubeIdentifierFromUrl(candidate);
        if (identifier) keys.add(`youtube:url:${identifier}`);
    }

    return [...keys];
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
        let hasYoutubeItems = false;

        for (const item of items) {
            const platform = detectPlatform(item, actorId);
            if (!platform) continue;
            if (platform === 'youtube') hasYoutubeItems = true;
            const username = extractUsername(platform, item);
            if (!username && platform !== 'youtube') continue;
            if (!username) continue;
            usernameBuckets[platform].add(username);
        }

        const profileMap = new Map<string, string>();
        const profileMetadataUpdates = new Map<string, ProfileMetadataUpdate>();
        const profileSnapshotInserts = new Map<string, ProfileSnapshotInsert>();

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

        if (hasYoutubeItems) {
            const { data: youtubeProfiles } = await supabaseAdmin
                .from('profiles')
                .select('id, username, profile_url')
                .eq('platform', 'youtube')
            if (youtubeProfiles) {
                youtubeProfiles.forEach((profile) => {
                    const keys = buildYoutubeProfileLookupKeys(profile);
                    keys.forEach((key) => profileMap.set(key, profile.id));
                });
            }
        }

        const postsToUpsert: Array<Record<string, unknown>> = [];

        for (const item of items) {
            const itemData = item as DatasetItem;
            const platform = detectPlatform(itemData, actorId);
            if (!platform) continue;
            const username = extractUsername(platform, itemData);
            if (!username && platform !== 'youtube') continue;
            const isInstagramDetailsItem = platform === 'instagram' && isInstagramProfileDetailsItem(itemData);

            let profileId: string | undefined;
            if (platform === 'youtube') {
                const lookupKeys = buildYoutubeItemLookupKeys(itemData, username);
                for (const key of lookupKeys) {
                    const found = profileMap.get(key);
                    if (found) {
                        profileId = found;
                        break;
                    }
                }
            } else {
                profileId = profileMap.get(`${platform}:${username}`);
            }

            if (!profileId) continue;

            const incomingProfileMetadata = platform === 'instagram'
                ? isInstagramProfileDetailsItem(itemData)
                    ? extractInstagramProfileDetailsMetadata(itemData)
                    : extractInstagramProfileMetadata(itemData)
                : platform === 'tiktok'
                    ? extractTikTokProfileMetadata(itemData)
                    : extractYouTubeProfileMetadata(itemData);
            profileMetadataUpdates.set(
                profileId,
                mergeProfileMetadata(profileMetadataUpdates.get(profileId), incomingProfileMetadata)
            );

            if (
                incomingProfileMetadata.profile_scraped_at &&
                (
                    typeof incomingProfileMetadata.followers_count === 'number'
                    || typeof incomingProfileMetadata.follows_count === 'number'
                    || typeof incomingProfileMetadata.profile_posts_count === 'number'
                )
            ) {
                profileSnapshotInserts.set(profileId, {
                    profile_id: profileId,
                    platform,
                    followers_count: incomingProfileMetadata.followers_count,
                    follows_count: incomingProfileMetadata.follows_count,
                    profile_posts_count: incomingProfileMetadata.profile_posts_count,
                    recorded_at: incomingProfileMetadata.profile_scraped_at,
                });
            }

            if (isInstagramDetailsItem) {
                continue;
            }

            if (!itemData.id) {
                continue;
            } else if (platform === 'instagram') {
                postsToUpsert.push(mapInstagramItem(itemData, profileId));
            } else if (platform === 'tiktok') {
                postsToUpsert.push(mapTikTokItem(itemData, profileId));
            } else {
                postsToUpsert.push(mapYoutubeItem(itemData, profileId));
            }
        }

        if (profileMetadataUpdates.size > 0) {
            await Promise.all(
                [...profileMetadataUpdates.entries()].map(async ([profileId, update]) => {
                    const payload = Object.fromEntries(
                        Object.entries(update).filter(([, value]) => value !== undefined)
                    );

                    if (Object.keys(payload).length === 0) return;

                    const { error: profileUpdateError } = await supabaseAdmin
                        .from('profiles')
                        .update(payload)
                        .eq('id', profileId);

                    if (profileUpdateError) {
                        console.error('Profile metadata update error:', profileUpdateError);
                    }
                })
            );
        }

        if (profileSnapshotInserts.size > 0) {
            const { error: snapshotInsertError } = await supabaseAdmin
                .from('profile_snapshots')
                .insert([...profileSnapshotInserts.values()]);

            if (snapshotInsertError) {
                console.error('Profile snapshot insert error:', snapshotInsertError);
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

            const touchedProfileIds = [...new Set(
                postsToUpsert
                    .map((post) => (typeof post.profile_id === 'string' ? post.profile_id : null))
                    .filter((value): value is string => Boolean(value))
            )];

            if (touchedProfileIds.length > 0) {
                try {
                    await syncProfileAiSignals(touchedProfileIds);
                } catch (aiSyncError) {
                    console.error('AI profile tag sync error:', aiSyncError);
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
