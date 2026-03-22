/**
 * Bot Intake Service
 * Handles the business logic for bot-submitted URLs
 */

import { classifyUrl } from './classify-url';
import type { 
  BotIntakeRequest, 
  BotIntakeResponse
} from './types';
import { isValidBenchmarkTag, isValidCultureTag, isValidContentTag } from '@/lib/taxonomy';
import type { IngestResult, BatchIngestResult, SingleIngestResult } from '@/lib/ingest/types';

/**
 * Process a bot intake request
 * 
 * 1. Classify the URL server-side (authoritative)
 * 2. Validate required fields based on route
 * 3. Dispatch to appropriate existing service
 * 4. Return unified response
 */
export async function processBotIntake(request: BotIntakeRequest): Promise<BotIntakeResponse> {
  const { url, requestedBy, profileTags } = request;
  
  // Step 1: Server-side URL classification (authoritative)
  const { route, cleanUrl } = classifyUrl(url);
  
  // Step 2: Route-specific validation and handling
  switch (route) {
    case 'x_author_page':
      return handleXAuthorPage(cleanUrl, requestedBy);
      
    case 'x_post_page':
      return handleXPostPage(cleanUrl, requestedBy);
      
    case 'creator_profile':
      return handleCreatorProfile(cleanUrl, requestedBy, profileTags);
      
    case 'unsupported':
    default:
      return {
        route: 'unsupported',
        status: 'rejected',
        message: 'Only X author pages, X post URLs, and Instagram/TikTok/YouTube creator profiles are supported.',
      };
  }
}

/**
 * Check if ingest result is a batch result (for author tracking)
 */
function isBatchResult(result: IngestResult): result is BatchIngestResult {
  return result.mode !== 'single_url';
}

/**
 * Handle X author page URL
 * -> Add to tracked sources and trigger author tracking
 */
async function handleXAuthorPage(url: string, requestedBy: string): Promise<BotIntakeResponse> {
  try {
    const { ingestSource } = await import('@/lib/ingest/service');
    const { upsertTrackedSource } = await import('@/lib/ingest/persistence');
    
    // Extract handle from URL
    const handle = extractXHandle(url);
    if (!handle) {
      return {
        route: 'x_author_page',
        status: 'rejected',
        message: 'Invalid X author URL format.',
      };
    }
    
    // Trigger author tracking ingest
    const result = await ingestSource({
      mode: 'author_tracking',
      authorHandle: handle,
      authorUrl: url,
      sourcePlatform: 'x',
      requestedBy,
      ingestMethod: 'auto_tracked',
      sort: 'Latest',
      maxItems: 10,
    });
    
    // Use type guard to safely access batch result properties
    if (!isBatchResult(result)) {
      return {
        route: 'x_author_page',
        status: 'rejected',
        message: 'Unexpected result type for author tracking.',
      };
    }
    
    // Now TypeScript knows result is BatchIngestResult
    const latestItem = result.items?.[0];
    const trackedSource = await upsertTrackedSource({
      handle,
      authorUrl: url,
      displayName: latestItem?.sourceRecord?.author_name || `@${handle}`,
      latestHeadline: latestItem?.newsItem?.title || null,
      latestSourceRecordId: latestItem?.sourceRecord?.id || null,
      createdBy: requestedBy,
    });
    
    return {
      route: 'x_author_page',
      status: 'accepted',
      message: 'Tracked source added and author fetch triggered.',
      data: {
        trackedSourceId: trackedSource.id,
        totalPersisted: result.totalPersisted,
      },
    };
  } catch (error) {
    console.error('X author page intake error:', error);
    return {
      route: 'x_author_page',
      status: 'rejected',
      message: error instanceof Error ? error.message : 'Failed to process X author URL.',
    };
  }
}

/**
 * Handle X post URL
 * -> Ingest as news candidate
 */
async function handleXPostPage(url: string, requestedBy: string): Promise<BotIntakeResponse> {
  try {
    const { ingestSource } = await import('@/lib/ingest/service');
    
    const result = await ingestSource({
      mode: 'single_url',
      sourceUrl: url,
      sourcePlatform: 'x',
      requestedBy,
      ingestMethod: 'manual',
    });
    
    // For single URL, result is SingleIngestResult
    if (isBatchResult(result)) {
      return {
        route: 'x_post_page',
        status: 'rejected',
        message: 'Unexpected result type for single URL.',
      };
    }
    
    // Now TypeScript knows result is SingleIngestResult
    return {
      route: 'x_post_page',
      status: 'completed',
      message: 'X content ingested and pending review.',
      data: {
        jobId: result.job?.id,
        newsItemId: result.newsItem?.id,
      },
    };
  } catch (error) {
    console.error('X post page intake error:', error);
    return {
      route: 'x_post_page',
      status: 'rejected',
      message: error instanceof Error ? error.message : 'Failed to process X post URL.',
    };
  }
}

/**
 * Handle creator profile URL
 * -> Create profile with tags and trigger scrape
 * 
 * NOTE: created_by is set to NULL for bot-created profiles.
 * Bot requestedBy format (e.g., "openclaw:user_42") is not a valid uuid
 * and cannot be used as foreign key. A dedicated system user should be
 * created and used for bot-originated profiles.
 * 
 * NOTE: profile_tags insertion failure does NOT trigger rollback.
 * This is an accepted tradeoff: if tags fail, profile is created but tags are missing.
 */
async function handleCreatorProfile(
  url: string, 
  requestedBy: string, 
  profileTags?: BotIntakeRequest['profileTags']
): Promise<BotIntakeResponse> {
  // Validate required tags
  if (!profileTags) {
    return {
      route: 'creator_profile',
      status: 'rejected',
      message: 'Profile tags are required for creator profile URLs.',
      missingTags: ['benchmarkType', 'cultureTags', 'contentTags'],
    };
  }
  
  const { benchmarkType, cultureTags = [], contentTags = [] } = profileTags;
  
  // Validate benchmarkType
  if (!benchmarkType || !isValidBenchmarkTag(benchmarkType)) {
    return {
      route: 'creator_profile',
      status: 'rejected',
      message: 'Invalid or missing benchmarkType.',
      missingTags: ['benchmarkType'],
    };
  }
  
  // Validate cultureTags
  const invalidCulture = cultureTags.filter(t => !isValidCultureTag(t));
  if (invalidCulture.length > 0) {
    return {
      route: 'creator_profile',
      status: 'rejected',
      message: `Invalid culture tags: ${invalidCulture.join(', ')}`,
      missingTags: ['cultureTags'],
    };
  }
  
  // Validate contentTags
  const invalidContent = contentTags.filter(t => !isValidContentTag(t));
  if (invalidContent.length > 0) {
    return {
      route: 'creator_profile',
      status: 'rejected',
      message: `Invalid content tags: ${invalidContent.join(', ')}`,
      missingTags: ['contentTags'],
    };
  }
  
  // Aesthetic benchmark cannot have culture/content tags
  if (benchmarkType === 'aesthetic_benchmark' && (cultureTags.length > 0 || contentTags.length > 0)) {
    return {
      route: 'creator_profile',
      status: 'rejected',
      message: 'Aesthetic benchmark cannot have culture/content tags.',
    };
  }
  
  try {
    // Detect platform and create profile
    const { detectPlatformFromProfileUrl, parseProfileInput } = await import('@/lib/profile-input');
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { triggerInstagramScrape, triggerTikTokScrape, triggerYoutubeScrape } = await import('@/lib/apify');
    
    const platform = detectPlatformFromProfileUrl(url);
    if (!platform) {
      return {
        route: 'creator_profile',
        status: 'rejected',
        message: 'Could not detect platform from URL.',
      };
    }
    
    const parsed = parseProfileInput(platform, url);
    if (!parsed) {
      return {
        route: 'creator_profile',
        status: 'rejected',
        message: 'Invalid profile URL format.',
      };
    }
    
    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('platform', platform)
      .eq('username', parsed.username.toLowerCase())
      .maybeSingle();
    
    if (existing) {
      return {
        route: 'creator_profile',
        status: 'rejected',
        message: 'Profile already exists.',
      };
    }
    
    // Prepare tag data
    const tagIds = [benchmarkType, ...cultureTags, ...contentTags];
    
    // Create profile
    // NOTE: created_by is NULL for bot-created profiles
    // requestedBy format "openclaw:user_42" is not a valid uuid
    const { data: insertedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        platform,
        username: parsed.username.toLowerCase(),
        profile_url: parsed.profileUrl,
        full_name: parsed.username,
        created_by: null,
      })
      .select()
      .single();
    
    if (profileError || !insertedProfile) {
      return {
        route: 'creator_profile',
        status: 'rejected',
        message: profileError?.message || 'Failed to create profile.',
      };
    }
    
    // Add tags
    // NOTE: Supabase errors are returned in result.error, NOT thrown as exceptions
    // Accepted tradeoff: if tags fail, profile is created but tags are missing
    // This is logged for observability but does not fail the request
    if (tagIds.length > 0) {
      const tagInserts = tagIds.map((tagId) => ({
        profile_id: insertedProfile.id,
        tag_id: tagId,
      }));
      
      const { error: tagsError } = await supabaseAdmin
        .from('profile_tags')
        .insert(tagInserts);
      
      if (tagsError) {
        // Accepted tradeoff: log the error for observability, profile was already created
        console.error('[bot-intake] Failed to insert profile tags - profile created without tags:', {
          profileId: insertedProfile.id,
          tagIds,
          error: tagsError,
        });
      }
    }
    
    // Trigger scrape (accepted tradeoff: no rollback on failure)
    try {
      if (platform === 'instagram') {
        await triggerInstagramScrape([parsed.username]);
      } else if (platform === 'tiktok') {
        await triggerTikTokScrape([parsed.username]);
      } else if (platform === 'youtube') {
        await triggerYoutubeScrape([parsed.profileUrl]);
      }
    } catch (scrapeError) {
      console.error('Failed to trigger initial scrape:', scrapeError);
    }
    
    return {
      route: 'creator_profile',
      status: 'accepted',
      message: 'Profile created and initial scrape triggered.',
      data: {
        profileId: insertedProfile.id,
        platform,
      },
    };
  } catch (error) {
    console.error('Creator profile intake error:', error);
    return {
      route: 'creator_profile',
      status: 'rejected',
      message: error instanceof Error ? error.message : 'Failed to process creator profile URL.',
    };
  }
}

/**
 * Extract X handle from URL
 */
function extractXHandle(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 1) {
      return pathParts[0].replace(/^@/, '');
    }
    return null;
  } catch {
    return null;
  }
}
