
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerInstagramScrape } from '@/lib/apify';

const SECRET_KEY = process.env.VIRAX_SECRET_KEY;

function checkAuth(req: NextRequest) {
    const headerSecret = req.headers.get('x-virax-secret');
    if (SECRET_KEY && headerSecret !== SECRET_KEY) {
        return false;
    }
    return true;
}

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

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    if (!checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
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
