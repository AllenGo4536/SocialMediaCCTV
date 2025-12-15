
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerInstagramScrape } from '@/lib/apify';



export async function GET(req: NextRequest) {
    // if (!checkAuth(req)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    // Feed page needs profiles too? If Admin only, then protect. 
    // User said "Manage Center" -> Admin. "Feed" -> Public (Internal).
    // Assuming GET profiles is public for internal usage or just protected?
    // User said "Page read-only database".
    // Let's keep GET open or use a separate public vs admin endpoint.
    // For now, let's keep it simple. If it's for 'Manage Center', maybe protect it. 
    // But wait, the Feed needs to know which profiles exist? Or just fetch posts?
    // Feed fetches posts. Admin fetches profiles.

    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Identify needed users
    const userIds = profiles
        .map(p => p.created_by)
        .filter(Boolean); // Filter null/undefined

    if (userIds.length > 0) {
        // Fetch emails from app_users
        const { data: users } = await supabaseAdmin
            .from('app_users')
            .select('id, email')
            .in('id', userIds);

        // Map emails back to profiles
        if (users) {
            const userMap = new Map(users.map(u => [u.id, u.email]));

            // Mutate profile objects to add creator_email
            // @ts-ignore - Supabase types might not have creator_email yet since we didn't update generated types, but our internal type has it.
            profiles.forEach(p => {
                if (p.created_by && userMap.has(p.created_by)) {
                    p.creator_email = userMap.get(p.created_by);
                }
            });
        }
    }

    return NextResponse.json(profiles);
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

        const { username } = await req.json();

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        // 1. Check if exists
        const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Profile already exists' }, { status: 409 });
        }

        // 2. Insert
        // Use a default url construction if user only provides username
        const profileUrl = `https://www.instagram.com/${username}/`;

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .insert({
                username,
                profile_url: profileUrl,
                full_name: username, // Update later via webhook?
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // 3. Trigger Initial Scrape
        // Don't await this? Or do? 
        // Apify start() is fast (just registers run).
        try {
            await triggerInstagramScrape([username]);
        } catch (e) {
            console.error('Failed to trigger initial scrape', e);
            // Don't fail the request, just warn
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
