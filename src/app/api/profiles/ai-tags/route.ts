import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncProfileAiSignals } from '@/lib/ai-profile-sync';

async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (!user || error) return null;

  return user;
}

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const profileId = typeof payload?.profileId === 'string' ? payload.profileId.trim() : '';
    const result = await syncProfileAiSignals(profileId ? [profileId] : undefined);
    return NextResponse.json({
      success: true,
      processedCount: result.processedCount,
      profiles: result.profiles,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
