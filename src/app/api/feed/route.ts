
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Public endpoint? Or internal use? 
// User said "Internal tool", no auth.
// Client components might read this.
// We can use supabaseAdmin here too since we're just reading what we want to serve.

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '40'), 100);
    const offset = (page - 1) * limit;

    // Query: Posts joined with Profiles
    // Supabase `select` with join syntax: `*, profiles(*)`
    const { data, count, error } = await supabaseAdmin
        .from('posts')
        .select(`
      *,
      profiles!inner (
        username,
        avatar_url,
        full_name
      )
    `, { count: 'exact' })
        .order('like_count', { ascending: false }) // Requirement: Sorted by likes DESC
        .range(offset, offset + limit - 1);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        data,
        meta: {
            page,
            limit,
            total: count,
            hasMore: count ? (offset + limit < count) : false
        }
    });
}
