import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidPlatform } from '@/lib/taxonomy';
import type { Platform } from '@/lib/taxonomy';

interface GrowthProfileRow {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url: string | null;
    platform: Platform;
    followers_count: number | null;
    profile_scraped_at: string | null;
}

interface ProfileSnapshotRow {
    profile_id: string;
    followers_count: number | null;
    follows_count: number | null;
    profile_posts_count: number | null;
    recorded_at: string;
}

interface SnapshotPoint {
    followersCount: number;
    followsCount: number | null;
    profilePostsCount: number | null;
    recordedAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LOOKBACK_DAYS = 120;

function clampWindowDays(rawValue: string | null) {
    const parsed = Number.parseInt(rawValue || '', 10);
    if (!Number.isFinite(parsed)) return 7;
    if (parsed <= 7) return 7;
    if (parsed <= 14) return 14;
    return 30;
}

function clampLimit(rawValue: string | null) {
    const parsed = Number.parseInt(rawValue || '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 50;
    return Math.min(parsed, 100);
}

function average(values: number[]) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const platformParam = searchParams.get('platform');
    const platform = (platformParam && isValidPlatform(platformParam) ? platformParam : 'instagram') as Platform;
    const windowDays = clampWindowDays(searchParams.get('windowDays'));
    const limit = clampLimit(searchParams.get('limit'));

    const { data: profiles, error: profilesError, count: totalProfiles } = await supabaseAdmin
        .from('profiles')
        .select(
            'id, username, full_name, avatar_url, profile_url, platform, followers_count, profile_scraped_at',
            { count: 'exact' }
        )
        .eq('platform', platform)
        .order('followers_count', { ascending: false, nullsFirst: false });

    if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const safeProfiles = (profiles || []) as GrowthProfileRow[];
    if (safeProfiles.length === 0) {
        return NextResponse.json({
            data: [],
            meta: {
                platform,
                windowDays,
                totalProfiles: 0,
                rankedProfiles: 0,
                insufficientProfiles: 0,
                generatedAt: new Date().toISOString(),
            },
        });
    }

    const lookbackStartIso = new Date(Date.now() - MAX_LOOKBACK_DAYS * DAY_MS).toISOString();
    const { data: snapshots, error: snapshotsError } = await supabaseAdmin
        .from('profile_snapshots')
        .select('profile_id, followers_count, follows_count, profile_posts_count, recorded_at')
        .eq('platform', platform)
        .gte('recorded_at', lookbackStartIso)
        .order('recorded_at', { ascending: true });

    if (snapshotsError) {
        return NextResponse.json({ error: snapshotsError.message }, { status: 500 });
    }

    const profileMap = new Map<string, GrowthProfileRow>(
        safeProfiles.map((profile) => [profile.id, profile])
    );
    const snapshotsByProfile = new Map<string, SnapshotPoint[]>();

    for (const row of (snapshots || []) as ProfileSnapshotRow[]) {
        if (!profileMap.has(row.profile_id)) continue;
        if (typeof row.followers_count !== 'number') continue;

        const current = snapshotsByProfile.get(row.profile_id) || [];
        current.push({
            followersCount: row.followers_count,
            followsCount: row.follows_count,
            profilePostsCount: row.profile_posts_count,
            recordedAt: row.recorded_at,
        });
        snapshotsByProfile.set(row.profile_id, current);
    }

    for (const profile of safeProfiles) {
        if (typeof profile.followers_count !== 'number' || !profile.profile_scraped_at) continue;

        const current = snapshotsByProfile.get(profile.id) || [];
        const latestRecordedAt = current[current.length - 1]?.recordedAt;
        if (latestRecordedAt === profile.profile_scraped_at) continue;

        current.push({
            followersCount: profile.followers_count,
            followsCount: null,
            profilePostsCount: null,
            recordedAt: profile.profile_scraped_at,
        });
        current.sort((left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime());
        snapshotsByProfile.set(profile.id, current);
    }

    const now = Date.now();
    const requestedWindowStart = now - windowDays * DAY_MS;
    const ranked: Array<{
        profile_id: string;
        platform: Platform;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
        profile_url: string | null;
        current_followers: number;
        baseline_followers: number;
        delta_followers: number;
        velocity_followers_per_day: number;
        growth_rate_pct: number | null;
        tracked_days: number;
        actual_window_days: number;
        has_full_window: boolean;
        last_recorded_at: string;
        sparkline: Array<{ date: string; followers: number }>;
    }> = [];

    let insufficientProfiles = 0;

    for (const profile of safeProfiles) {
        const rawSeries = snapshotsByProfile.get(profile.id) || [];
        if (rawSeries.length < 2) {
            insufficientProfiles += 1;
            continue;
        }

        const dailySeriesMap = new Map<string, SnapshotPoint>();
        for (const point of rawSeries) {
            const dayKey = point.recordedAt.slice(0, 10);
            dailySeriesMap.set(dayKey, point);
        }

        const dailySeries = [...dailySeriesMap.values()].sort(
            (left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime()
        );

        if (dailySeries.length < 2) {
            insufficientProfiles += 1;
            continue;
        }

        const latestPoint = dailySeries[dailySeries.length - 1];
        const baselinePoint =
            [...rawSeries]
                .reverse()
                .find((point) => new Date(point.recordedAt).getTime() <= requestedWindowStart)
            || dailySeries[0];

        const latestTime = new Date(latestPoint.recordedAt).getTime();
        const baselineTime = new Date(baselinePoint.recordedAt).getTime();
        const elapsedDays = (latestTime - baselineTime) / DAY_MS;

        if (elapsedDays < 1) {
            insufficientProfiles += 1;
            continue;
        }

        const deltaFollowers = latestPoint.followersCount - baselinePoint.followersCount;
        const velocityFollowersPerDay = deltaFollowers / elapsedDays;

        ranked.push({
            profile_id: profile.id,
            platform: profile.platform,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            profile_url: profile.profile_url,
            current_followers: latestPoint.followersCount,
            baseline_followers: baselinePoint.followersCount,
            delta_followers: deltaFollowers,
            velocity_followers_per_day: velocityFollowersPerDay,
            growth_rate_pct: baselinePoint.followersCount > 0
                ? (deltaFollowers / baselinePoint.followersCount) * 100
                : null,
            tracked_days: dailySeries.length,
            actual_window_days: elapsedDays,
            has_full_window: baselineTime <= requestedWindowStart,
            last_recorded_at: latestPoint.recordedAt,
            sparkline: dailySeries.slice(-14).map((point) => ({
                date: point.recordedAt.slice(0, 10),
                followers: point.followersCount,
            })),
        });
    }

    ranked.sort((left, right) => {
        if (right.velocity_followers_per_day !== left.velocity_followers_per_day) {
            return right.velocity_followers_per_day - left.velocity_followers_per_day;
        }
        return right.delta_followers - left.delta_followers;
    });

    const limited = ranked.slice(0, limit);
    const positiveGrowthCount = ranked.filter((item) => item.delta_followers > 0).length;
    const averageVelocity = average(ranked.map((item) => item.velocity_followers_per_day));

    return NextResponse.json({
        data: limited,
        meta: {
            platform,
            windowDays,
            totalProfiles: totalProfiles || safeProfiles.length,
            rankedProfiles: ranked.length,
            insufficientProfiles,
            positiveGrowthCount,
            averageVelocity,
            generatedAt: new Date().toISOString(),
        },
    });
}
