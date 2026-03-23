import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function getAuthenticatedUserFromRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return null;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || user.id,
  };
}
