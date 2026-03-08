
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerInstagramScrape, triggerTikTokScrape, triggerYoutubeScrape } from '@/lib/apify';
import { parseProfileInput } from '@/lib/profile-input';
import {
    isValidBenchmarkTag,
    isValidContentTag,
    isValidCultureTag,
    isValidPlatform,
} from '@/lib/taxonomy';
import type { Platform } from '@/lib/taxonomy';

function uniqueStrings(values: string[]) {
    return [...new Set(values)];
}

interface ProfileTagRow {
    profile_id: string;
    tag_definitions:
    | { id: string; name: string; group_key: string }
    | Array<{ id: string; name: string; group_key: string }>;
}

export async function GET() {
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safeProfiles = profiles || [];
    const userIds = uniqueStrings(
        safeProfiles
            .map((p) => p.created_by)
            .filter((value): value is string => Boolean(value))
    );
    const profileIds = safeProfiles.map(p => p.id);

    const userMap = new Map<string, string | null>();
    if (userIds.length > 0) {
        const { data: users } = await supabaseAdmin
            .from('app_users')
            .select('id, email')
            .in('id', userIds);
        if (users) {
            users.forEach((u) => userMap.set(u.id, u.email));
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

    const enrichedProfiles = safeProfiles.map((profile) => ({
        ...profile,
        creator_email: profile.created_by ? userMap.get(profile.created_by) || null : null,
        tags: tagsMap.get(profile.id) || [],
    }));

    return NextResponse.json(enrichedProfiles);
}

function normalizeUsernameForPlatform(platform: Platform, username: string) {
    if (platform === 'instagram' || platform === 'tiktok' || platform === 'youtube') {
        return username.toLowerCase();
    }
    return username;
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (!user || userError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const platformRaw = typeof payload.platform === 'string' ? payload.platform.trim() : '';
        const input = typeof payload.input === 'string' ? payload.input.trim() : '';
        const manualUsername = typeof payload.manualUsername === 'string' ? payload.manualUsername.trim() : '';
        const benchmarkType = typeof payload.benchmarkType === 'string' ? payload.benchmarkType : '';
        const cultureTags = Array.isArray(payload.cultureTags)
            ? payload.cultureTags.filter((tag: unknown): tag is string => typeof tag === 'string')
            : [];
        const contentTags = Array.isArray(payload.contentTags)
            ? payload.contentTags.filter((tag: unknown): tag is string => typeof tag === 'string')
            : [];

        if (!platformRaw || !isValidPlatform(platformRaw)) {
            return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
        }
        if (!input) {
            return NextResponse.json({ error: 'Profile input is required' }, { status: 400 });
        }
        if (!benchmarkType || !isValidBenchmarkTag(benchmarkType)) {
            return NextResponse.json({ error: 'Benchmark type is required' }, { status: 400 });
        }

        const invalidCultureTag = cultureTags.find((tag: string) => !isValidCultureTag(tag));
        if (invalidCultureTag) {
            return NextResponse.json({ error: `Invalid culture tag: ${invalidCultureTag}` }, { status: 400 });
        }

        const invalidContentTag = contentTags.find((tag: string) => !isValidContentTag(tag));
        if (invalidContentTag) {
            return NextResponse.json({ error: `Invalid content tag: ${invalidContentTag}` }, { status: 400 });
        }

        const uniqueCultureTags = uniqueStrings(cultureTags);
        const uniqueContentTags = uniqueStrings(contentTags);

        if (benchmarkType === 'aesthetic_benchmark' && (uniqueCultureTags.length > 0 || uniqueContentTags.length > 0)) {
            return NextResponse.json(
                { error: 'Aesthetic benchmark cannot have culture/content tags' },
                { status: 400 }
            );
        }

        const parsedInput = parseProfileInput(platformRaw, input)
            || (platformRaw !== 'youtube' && manualUsername ? parseProfileInput(platformRaw, manualUsername) : null);
        if (!parsedInput) {
            return NextResponse.json({
                error: platformRaw === 'youtube'
                    ? 'YouTube 仅支持频道主页链接（如 https://www.youtube.com/@handle）'
                    : 'Invalid profile URL or username'
            }, { status: 400 });
        }

        const platform = platformRaw as Platform;
        const username = normalizeUsernameForPlatform(platform, parsedInput.username);
        const profileUrl = parsedInput.profileUrl;

        const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('platform', platform)
            .eq('username', username)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Profile already exists' }, { status: 409 });
        }

        const { data: insertedProfile, error } = await supabaseAdmin
            .from('profiles')
            .insert({
                platform,
                username,
                profile_url: profileUrl,
                full_name: username,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        const tagIds = [benchmarkType, ...uniqueCultureTags, ...uniqueContentTags];
        if (tagIds.length === 0) {
            return NextResponse.json({ error: 'At least one tag is required' }, { status: 400 });
        }

        const { error: profileTagError } = await supabaseAdmin
            .from('profile_tags')
            .insert(tagIds.map((tagId) => ({
                profile_id: insertedProfile.id,
                tag_id: tagId,
            })));

        if (profileTagError) {
            await supabaseAdmin.from('profiles').delete().eq('id', insertedProfile.id);
            return NextResponse.json({ error: profileTagError.message }, { status: 500 });
        }

        try {
            if (platform === 'instagram') {
                await triggerInstagramScrape([username]);
            } else if (platform === 'tiktok') {
                await triggerTikTokScrape([username]);
            } else if (platform === 'youtube') {
                await triggerYoutubeScrape([profileUrl]);
            }
        } catch (e) {
            console.error('Failed to trigger initial scrape', e);
        }

        return NextResponse.json({
            ...insertedProfile,
            tags: tagIds,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
