
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
    DEFAULT_PROFILE_BENCHMARK_TAG,
    isValidBenchmarkTag,
    isValidContentTag,
    isValidCultureTag,
} from '@/lib/taxonomy';
import type { BenchmarkTag } from '@/lib/taxonomy';

const SECRET_KEY = process.env.VIRAX_SECRET_KEY;

interface RouteContext {
    params: Promise<{ id: string }>;
}

function uniqueStrings(values: string[]) {
    return [...new Set(values)];
}

async function authenticateRequest(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return null;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (!user || error) {
        return null;
    }

    return user;
}

export async function PUT(
    req: NextRequest,
    { params }: RouteContext
) {
    const user = await authenticateRequest(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const payload = await req.json();
    const benchmarkTypeInput = typeof payload?.benchmarkType === 'string' ? payload.benchmarkType.trim() : '';
    const cultureTags = Array.isArray(payload?.cultureTags)
        ? payload.cultureTags.filter((tag: unknown): tag is string => typeof tag === 'string')
        : [];
    const contentTags = Array.isArray(payload?.contentTags)
        ? payload.contentTags.filter((tag: unknown): tag is string => typeof tag === 'string')
        : [];

    if (benchmarkTypeInput && !isValidBenchmarkTag(benchmarkTypeInput)) {
        return NextResponse.json({ error: 'Invalid benchmark type' }, { status: 400 });
    }

    const invalidCultureTag = cultureTags.find((tag: string) => !isValidCultureTag(tag));
    if (invalidCultureTag) {
        return NextResponse.json({ error: `Invalid culture tag: ${invalidCultureTag}` }, { status: 400 });
    }

    const invalidContentTag = contentTags.find((tag: string) => !isValidContentTag(tag));
    if (invalidContentTag) {
        return NextResponse.json({ error: `Invalid content tag: ${invalidContentTag}` }, { status: 400 });
    }

    const benchmarkType = (benchmarkTypeInput || DEFAULT_PROFILE_BENCHMARK_TAG) as BenchmarkTag;
    const uniqueCultureTags = uniqueStrings(cultureTags);
    const uniqueContentTags = uniqueStrings(contentTags);

    if (benchmarkType !== 'ip_benchmark' && (uniqueCultureTags.length > 0 || uniqueContentTags.length > 0)) {
        return NextResponse.json(
            { error: 'Only IP benchmark supports culture/content tags' },
            { status: 400 }
        );
    }

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', id)
        .maybeSingle();

    if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const tagIds = benchmarkType === 'ip_benchmark'
        ? [benchmarkType, ...uniqueCultureTags, ...uniqueContentTags]
        : [benchmarkType];

    const { error: deleteError } = await supabaseAdmin
        .from('profile_tags')
        .delete()
        .eq('profile_id', id);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { error: insertError } = await supabaseAdmin
        .from('profile_tags')
        .insert(tagIds.map((tagId) => ({
            profile_id: id,
            tag_id: tagId,
        })));

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tags: tagIds });
}

export async function DELETE(
    req: NextRequest,
    { params }: RouteContext
) {
    const headerSecret = req.headers.get('x-virax-secret');
    if (SECRET_KEY && headerSecret !== SECRET_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
