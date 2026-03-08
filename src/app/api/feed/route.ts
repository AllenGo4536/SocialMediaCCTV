
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

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '40'), 100);
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
                    meta: { page, limit, total: 0, hasMore: false }
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
    for (const tagGroup of tagGroupFilters) {
        const { data: taggedProfiles, error: taggedProfilesError } = await supabaseAdmin
            .from('profile_tags')
            .select('profile_id')
            .in('tag_id', tagGroup);

        if (taggedProfilesError) {
            return NextResponse.json({ error: taggedProfilesError.message }, { status: 500 });
        }

        filteredProfileIds = intersectInto(
            filteredProfileIds,
            (taggedProfiles || []).map((row) => row.profile_id)
        );
    }

    if (filteredProfileIds && filteredProfileIds.size === 0) {
        return NextResponse.json({
            data: [],
            meta: { page, limit, total: 0, hasMore: false }
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
    `, { count: 'exact' });

    if (filteredProfileIds && filteredProfileIds.size > 0) {
        query = query.in('profile_id', [...filteredProfileIds]);
    }

    const days = searchParams.get('days');
    if (days && days !== 'all') {
        const daysNum = parseInt(days);
        if (!isNaN(daysNum)) {
            const date = new Date();
            date.setDate(date.getDate() - daysNum);
            query = query.gte('posted_at', date.toISOString());
        }
    }

    const { data, count, error } = await query
        .order('like_count', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safeData = (data || []) as FeedPostRow[];
    const profileIds = [...new Set(safeData.map((post) => post.profile_id))];
    const creatorIds = [
        ...new Set(
            safeData
                .map((post) => post.profiles?.created_by)
                .filter((id: unknown): id is string => typeof id === 'string')
        )
    ];

    const creatorEmailMap = new Map<string, string | null>();
    if (creatorIds.length > 0) {
        const { data: creators } = await supabaseAdmin
            .from('app_users')
            .select('id, email')
            .in('id', creatorIds);

        if (creators) {
            creators.forEach((user) => creatorEmailMap.set(user.id, user.email));
        }
    }

    const tagsMap = new Map<string, Array<{ id: string; label: string; group: string }>>();
    if (profileIds.length > 0) {
        const { data: profileTags } = await supabaseAdmin
            .from('profile_tags')
            .select('profile_id, tag_definitions!inner(id, name, group_key)')
            .in('profile_id', profileIds);

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
            total: count,
            hasMore: count ? (offset + limit < count) : false
        }
    });
}
