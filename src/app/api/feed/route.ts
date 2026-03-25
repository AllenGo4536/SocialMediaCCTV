
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
    isValidBenchmarkTag,
    isValidContentTag,
    isValidCultureTag,
    isValidPlatform,
} from '@/lib/taxonomy';

function parseCsvParam(value: string | null) {
    if (!value) return [];
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function intersectInto(base: Set<string> | null, ids: string[]) {
    const incoming = new Set(ids);
    if (!base) return incoming;
    for (const id of [...base]) {
        if (!incoming.has(id)) base.delete(id);
    }
    return base;
}

interface FeedProfile {
    username?: string | null;
    avatar_url?: string | null;
    full_name?: string | null;
    platform?: string | null;
    created_by?: string | null;
    profile_url?: string | null;
}

interface FeedPostRow {
    id: string;
    profile_id: string;
    posted_at?: string | null;
    profiles?: FeedProfile | null;
    [key: string]: unknown;
}

interface ProfileTagRow {
    profile_id: string;
    tag_definitions:
    | { id: string; name: string; group_key: string }
    | Array<{ id: string; name: string; group_key: string }>;
}

interface ProfileTagLookupRow {
    profile_id: string;
    tag_id: string;
}

function applyPostDateFilters<T extends {
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
}>(query: T, searchParams: URLSearchParams) {
    const days = searchParams.get('days');
    if (days && days !== 'all') {
        const daysNum = parseInt(days, 10);
        if (!Number.isNaN(daysNum)) {
            const date = new Date();
            date.setDate(date.getDate() - daysNum);
            query = query.gte('posted_at', date.toISOString());
        }
    }

    const startDate = searchParams.get('startDate');
    if (startDate) {
        const parsed = new Date(startDate);
        if (!Number.isNaN(parsed.getTime())) {
            query = query.gte('posted_at', parsed.toISOString());
        }
    }

    const endDate = searchParams.get('endDate');
    if (endDate) {
        const parsed = new Date(endDate);
        if (!Number.isNaN(parsed.getTime())) {
            query = query.lte('posted_at', parsed.toISOString());
        }
    }

    return query;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const limitParam = parseInt(searchParams.get('limit') || '40', 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : 40;

    const offset = (page - 1) * limit;

    const platforms = parseCsvParam(searchParams.get('platforms')).filter(isValidPlatform);
    const benchmarkTags = parseCsvParam(searchParams.get('benchmarkTypes')).filter(isValidBenchmarkTag);
    const cultureTags = parseCsvParam(searchParams.get('cultureTags')).filter(isValidCultureTag);
    const contentTags = parseCsvParam(searchParams.get('contentTags')).filter(isValidContentTag);
    const uploaderEmails = parseCsvParam(searchParams.get('uploaders'));

    let filteredProfileIds: Set<string> | null = null;

    if (platforms.length > 0 || uploaderEmails.length > 0) {
        let uploaderIds: string[] = [];
        if (uploaderEmails.length > 0) {
            const { data: users, error: usersError } = await supabaseAdmin
                .from('app_users')
                .select('id, email')
                .in('email', uploaderEmails);

            if (usersError) {
                return NextResponse.json({ error: usersError.message }, { status: 500 });
            }

            uploaderIds = (users || []).map((u) => u.id);
            if (uploaderIds.length === 0) {
                return NextResponse.json({
                    data: [],
                    meta: { page, limit, total: 0, totalPages: 0, hasMore: false }
                });
            }
        }

        let profileQuery = supabaseAdmin
            .from('profiles')
            .select('id, created_by, platform');

        if (platforms.length > 0) {
            profileQuery = profileQuery.in('platform', platforms);
        }
        if (uploaderIds.length > 0) {
            profileQuery = profileQuery.in('created_by', uploaderIds);
        }

        const { data: baseProfiles, error: baseProfilesError } = await profileQuery;
        if (baseProfilesError) {
            return NextResponse.json({ error: baseProfilesError.message }, { status: 500 });
        }

        filteredProfileIds = intersectInto(
            filteredProfileIds,
            (baseProfiles || []).map((profile) => profile.id)
        );
    }

    const tagGroupFilters = [benchmarkTags, cultureTags, contentTags].filter((group) => group.length > 0);
    if (tagGroupFilters.length > 0) {
        const allTagIds = [...new Set(tagGroupFilters.flat())];
        const { data: taggedProfiles, error: taggedProfilesError } = await supabaseAdmin
            .from('profile_tags')
            .select('profile_id, tag_id')
            .in('tag_id', allTagIds);

        if (taggedProfilesError) {
            return NextResponse.json({ error: taggedProfilesError.message }, { status: 500 });
        }

        const tagHitsByProfile = new Map<string, Set<string>>();
        for (const row of (taggedProfiles || []) as ProfileTagLookupRow[]) {
            const current = tagHitsByProfile.get(row.profile_id) || new Set<string>();
            current.add(row.tag_id);
            tagHitsByProfile.set(row.profile_id, current);
        }

        const matchedProfileIds: string[] = [];
        for (const [profileId, matchedTags] of tagHitsByProfile.entries()) {
            const matchesAllGroups = tagGroupFilters.every((group) =>
                group.some((tagId) => matchedTags.has(tagId))
            );
            if (matchesAllGroups) {
                matchedProfileIds.push(profileId);
            }
        }

        filteredProfileIds = intersectInto(
            filteredProfileIds,
            matchedProfileIds
        );
    }

    if (filteredProfileIds && filteredProfileIds.size === 0) {
        return NextResponse.json({
            data: [],
            meta: { page, limit, total: 0, totalPages: 0, hasMore: false }
        });
    }

    let query = supabaseAdmin
        .from('posts')
        .select(`
      *,
        profiles!inner (
        username,
        avatar_url,
        full_name,
        platform,
        created_by,
        profile_url
      )
    `);

    if (filteredProfileIds && filteredProfileIds.size > 0) {
        query = query.in('profile_id', [...filteredProfileIds]);
    }

    query = applyPostDateFilters(query, searchParams);

    let countQuery = supabaseAdmin
        .from('posts')
        .select('id', { count: 'exact', head: true });

    if (filteredProfileIds && filteredProfileIds.size > 0) {
        countQuery = countQuery.in('profile_id', [...filteredProfileIds]);
    }

    countQuery = applyPostDateFilters(countQuery, searchParams);

    const [
        { count, error: countError },
        { data, error },
    ] = await Promise.all([
        countQuery,
        query
            .order('like_count', { ascending: false })
            .range(offset, offset + limit),
    ]);

    if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rawData = (data || []) as FeedPostRow[];
    const hasMore = rawData.length > limit;
    const safeData = hasMore ? rawData.slice(0, limit) : rawData;
    const total = count || 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const profileIds = [...new Set(safeData.map((post) => post.profile_id))];
    const creatorIds = [
        ...new Set(
            safeData
                .map((post) => post.profiles?.created_by)
                .filter((id: unknown): id is string => typeof id === 'string')
        )
    ];

    const creatorEmailMap = new Map<string, string | null>();
    const tagsMap = new Map<string, Array<{ id: string; label: string; group: string }>>();

    const creatorsPromise = creatorIds.length > 0
        ? supabaseAdmin
            .from('app_users')
            .select('id, email')
            .in('id', creatorIds)
        : Promise.resolve({ data: null, error: null });

    const profileTagsPromise = profileIds.length > 0
        ? supabaseAdmin
            .from('profile_tags')
            .select('profile_id, tag_definitions!inner(id, name, group_key)')
            .in('profile_id', profileIds)
        : Promise.resolve({ data: null, error: null });

    const [
        { data: creators, error: creatorsError },
        { data: profileTags, error: profileTagsError },
    ] = await Promise.all([creatorsPromise, profileTagsPromise]);

    if (creatorsError) {
        return NextResponse.json({ error: creatorsError.message }, { status: 500 });
    }
    if (profileTagsError) {
        return NextResponse.json({ error: profileTagsError.message }, { status: 500 });
    }

    if (creatorIds.length > 0) {
        if (creators) {
            creators.forEach((user) => creatorEmailMap.set(user.id, user.email));
        }
    }

    if (profileIds.length > 0) {
        if (profileTags) {
            for (const row of profileTags as ProfileTagRow[]) {
                const tag = Array.isArray(row.tag_definitions)
                    ? row.tag_definitions[0]
                    : row.tag_definitions;
                if (!tag) continue;
                const current = tagsMap.get(row.profile_id) || [];
                current.push({
                    id: tag.id,
                    label: tag.name,
                    group: tag.group_key,
                });
                tagsMap.set(row.profile_id, current);
            }
        }
    }

    const enrichedPosts = safeData.map((post) => ({
        ...post,
        profiles: post.profiles
            ? {
                ...post.profiles,
                creator_email: post.profiles.created_by
                    ? creatorEmailMap.get(post.profiles.created_by) || null
                    : null,
                tags: tagsMap.get(post.profile_id) || [],
            }
            : post.profiles,
    }));

    return NextResponse.json({
        data: enrichedPosts,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasMore
        }
    });
}
