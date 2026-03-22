/**
 * Bot Intake API Route
 * POST /api/bot/intake
 * 
 * Unified entry point for OpenClaw bot to submit URLs
 * - Authenticates requests via shared secret
 * - Validates input
 * - Classifies URL server-side
 * - Dispatches to appropriate existing service
 * - Returns unified response contract
 */

import { NextRequest, NextResponse } from 'next/server';
import { processBotIntake } from '@/lib/bot/intake-service';
import type { BotIntakeRequest } from '@/lib/bot/types';
import { isSupabaseServerConfigured } from '@/lib/supabase';

const BOT_SECRET = process.env.OPENCLAW_BOT_SECRET || '';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

function validateBotRequest(body: unknown): { valid: true; data: BotIntakeRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }
  
  const req = body as Record<string, unknown>;
  
  // url is required and must be non-empty after trim
  if (!req.url || typeof req.url !== 'string' || String(req.url).trim().length === 0) {
    return { valid: false, error: 'url is required and must be a non-empty string' };
  }
  
  // requestedBy is required and must be non-empty after trim
  if (!req.requestedBy || typeof req.requestedBy !== 'string' || String(req.requestedBy).trim().length === 0) {
    return { valid: false, error: 'requestedBy is required and must be a non-empty string' };
  }
  
  // context is optional
  if (req.context && typeof req.context !== 'object') {
    return { valid: false, error: 'context must be an object' };
  }
  
  // profileTags is optional but must be an object if provided
  if (req.profileTags && typeof req.profileTags !== 'object') {
    return { valid: false, error: 'profileTags must be an object' };
  }
  
  return {
    valid: true,
    data: {
      url: String(req.url).trim(),
      requestedBy: String(req.requestedBy).trim(),
      context: req.context as BotIntakeRequest['context'],
      profileTags: req.profileTags as BotIntakeRequest['profileTags'],
    },
  };
}

export async function POST(request: NextRequest) {
  // Check Supabase configuration
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { 
        route: 'unsupported', 
        status: 'rejected', 
        message: 'Database is not configured. Please check environment variables.' 
      },
      { status: 500 }
    );
  }
  
  // Authenticate via shared secret
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  
  if (!token || token !== BOT_SECRET) {
    return NextResponse.json(
      { 
        route: 'unsupported', 
        status: 'rejected', 
        message: 'Invalid or missing bot secret.' 
      },
      { status: 401 }
    );
  }
  
  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { 
        route: 'unsupported', 
        status: 'rejected', 
        message: 'Invalid JSON body' 
      },
      { status: 400 }
    );
  }
  
  const validation = validateBotRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { 
        route: 'unsupported', 
        status: 'rejected', 
        message: validation.error 
      },
      { status: 400 }
    );
  }
  
  // Process the bot intake request
  try {
    const response = await processBotIntake(validation.data);
    
    // Determine HTTP status based on response
    const status = response.status === 'rejected' ? 400 : 200;
    
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Bot intake error:', error);
    return NextResponse.json(
      { 
        route: 'unsupported', 
        status: 'rejected', 
        message: `Internal error: ${getErrorMessage(error)}` 
      },
      { status: 500 }
    );
  }
}
