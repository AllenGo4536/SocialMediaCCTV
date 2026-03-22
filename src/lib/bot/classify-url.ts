/**
 * URL Classifier for Bot Intake
 * Server-side authoritative classification of user-submitted URLs
 * 
 * Classification Rules:
 * - x_author_page: X/Twitter root user page (/username only, no sub-paths)
 * - x_post_page: X/Twitter post URL (/status/, /i/status/, /article/)
 * - creator_profile: Instagram/TikTok/YouTube root creator profile only
 * - unsupported: everything else
 * 
 * Security: Hostname validation uses EXACT matching to prevent spoofing.
 * Do NOT use substring matching like hostname.includes('youtube.com')
 * as it would match evilyoutube.com, myyoutube.com, etc.
 */

import type { BotRoute } from './types';

interface URLClassification {
  route: BotRoute;
  cleanUrl: string;
}

// ============================================================================
// Platform Hostname Allowlist (EXACT MATCH ONLY)
// ============================================================================

const X_HOSTNAMES = new Set([
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
]);

const INSTAGRAM_HOSTNAMES = new Set([
  'instagram.com',
  'www.instagram.com',
  'i.instagram.com',
]);

const TIKTOK_HOSTNAMES = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
]);

const YOUTUBE_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
]);

// ============================================================================
// X / Twitter
// ============================================================================

/**
 * Known X/Twitter paths that are NOT author pages
 * These should be classified as 'unsupported' or 'x_post_page'
 */
const X_UNSUPPORTED_PATHS = new Set([
  'search', 'explore', 'home', 'i', 'messages', 'notifications',
  'settings', 'compose', 'login', 'logout', 'account', 'about',
  'tos', 'privacy', 'api', 'support', 'blog', 'hello',
]);

/**
 * Check if URL is an X/Twitter post page
 */
function isXPostUrl(pathname: string): boolean {
  return (
    pathname.includes('/status/') ||
    pathname.includes('/i/status/') ||
    pathname.includes('/article/')
  );
}

/**
 * Check if URL is an X/Twitter author page
 * Only /username (1 segment, valid username format) counts
 */
function isXAuthorUrl(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Must be exactly 1 path segment (the username)
  if (pathParts.length !== 1) {
    return false;
  }
  
  const segment = pathParts[0].toLowerCase();
  
  // Must not be a known X path keyword
  if (X_UNSUPPORTED_PATHS.has(segment)) {
    return false;
  }
  
  // Must match username format: alphanumeric + underscore, 1-15 chars
  const username = segment.replace(/^@/, '');
  return /^[a-z0-9_]{1,15}$/.test(username);
}

/**
 * Classify X/Twitter URLs
 */
function classifyXUrl(url: string): URLClassification {
  const cleanUrl = normalizeXUrl(url);
  const pathname = new URL(cleanUrl).pathname.toLowerCase();
  
  // Check for post URLs first
  if (isXPostUrl(pathname)) {
    return { route: 'x_post_page', cleanUrl };
  }
  
  // Check for author page
  if (isXAuthorUrl(pathname)) {
    return { route: 'x_author_page', cleanUrl };
  }
  
  // Everything else is unsupported
  return { route: 'unsupported', cleanUrl };
}

// ============================================================================
// Instagram
// ============================================================================

/**
 * Check if URL is an Instagram creator profile
 * Only root profile URLs count: /username (exactly 1 segment)
 * 
 * NOT profiles:
 * - /p/... (posts)
 * - /reel/... or /reels/... (reels)
 * - /stories/... (stories)
 * - /explplore/ (explore)
 * - /hashtags/... (hashtags)
 * - /accounts/... (accounts)
 * 
 * @example
 * https://www.instagram.com/nike/ -> VALID (1 segment: 'nike')
 * https://www.instagram.com/nike/reels/ -> INVALID (2 segments: 'nike', 'reels')
 * https://www.instagram.com/p/ABC123/ -> INVALID (not a profile)
 */
function isInstagramProfileUrl(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Must have EXACTLY 1 segment: /username
  if (pathParts.length !== 1) {
    return false;
  }
  
  const username = pathParts[0].toLowerCase();
  
  // These are NOT profile paths
  const nonProfilePaths = new Set([
    'p', 'reel', 'reels', 'explore', 'stories', 'tags', 'accounts',
    'login', 'developer', 'settings', 'about', 'privacy',
    'terms', 'api', 'support', 'help', 'blog', 'shop', 'life',
    'explore', 'discover', 'reels', 'following', 'shop',
  ]);
  
  if (nonProfilePaths.has(username)) {
    return false;
  }
  
  // Must be a valid username format (1-30 chars, alphanumeric + underscore + dot)
  return /^[a-z0-9_.]{1,30}$/.test(username);
}

// ============================================================================
// TikTok
// ============================================================================

/**
 * Check if URL is a TikTok creator profile
 * Only /@username (exactly 1 segment starting with @) counts
 * 
 * NOT profiles:
 * - /@user/video/... (specific videos)
 * - /discover (discover)
 * - /tag/... (hashtags)
 * - /foryou (FYP)
 * - /following
 */
function isTikTokProfileUrl(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Must have exactly 1 segment starting with @
  if (pathParts.length !== 1) {
    return false;
  }
  
  const segment = pathParts[0];
  
  // Must start with @
  if (!segment.startsWith('@')) {
    return false;
  }
  
  // Must be a valid username format (after @)
  const username = segment.slice(1);
  return /^[a-z0-9_.]{1,30}$/.test(username);
}

// ============================================================================
// YouTube
// ============================================================================

/**
 * Check if URL is a YouTube creator profile
 * 
 * Valid profile formats (exactly 2 segments):
 * - /@username (handle)
 * - /channel/UCxxx (channel ID)
 * - /user/username (legacy username)
 * - /c/username (custom URL)
 * 
 * NOT profiles (1 segment, or extra segments):
 * - /watch (single video)
 * - /shorts/abc (shorts)
 * - /live/abc (live)
 * - /@handle/videos (videos tab - 2 segments but not root)
 * - /@handle/shorts (shorts tab)
 * - /@handle/playlists
 * - /feed/subscriptions
 * - /playlist
 * - /account
 */
function isYouTubeProfileUrl(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Must have at least 1 segment
  if (pathParts.length === 0) {
    return false;
  }
  
  const firstSegment = pathParts[0].toLowerCase();
  
  // @handle format: must be exactly /@handle (1 segment)
  if (firstSegment.startsWith('@')) {
    return pathParts.length === 1;
  }
  
  // /channel/UCxxx, /user/username, /c/username: must be exactly 2 segments
  if (firstSegment === 'channel' || firstSegment === 'user' || firstSegment === 'c') {
    return pathParts.length === 2;
  }
  
  return false;
}

// ============================================================================
// Main Classification
// ============================================================================

/**
 * Classify a URL as one of the supported bot routes
 * 
 * Rules (authoritative, overrides any client-side pre-check):
 * - x_author_page: X/Twitter root user page only
 * - x_post_page: X/Twitter post URL (/status/, /i/status/, /article/)
 * - creator_profile: Instagram/TikTok/YouTube root creator profile only
 * - unsupported: everything else
 * 
 * @example
 * classifyUrl('https://x.com/elonmusk') // { route: 'x_author_page', cleanUrl: '...' }
 * classifyUrl('https://x.com/elonmusk/status/123') // { route: 'x_post_page', cleanUrl: '...' }
 * classifyUrl('https://www.instagram.com/nike/') // { route: 'creator_profile', cleanUrl: '...' }
 */
export function classifyUrl(input: string): URLClassification {
  const url = input.trim();
  
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    
    // X / Twitter (EXACT hostname match)
    if (X_HOSTNAMES.has(hostname)) {
      return classifyXUrl(url);
    }
    
    // Instagram (EXACT hostname match)
    if (INSTAGRAM_HOSTNAMES.has(hostname)) {
      if (isInstagramProfileUrl(pathname)) {
        const username = pathname.split('/').filter(Boolean)[0];
        return {
          route: 'creator_profile',
          cleanUrl: `https://www.instagram.com/${username}/`,
        };
      }
      return { route: 'unsupported', cleanUrl: url };
    }
    
    // TikTok (EXACT hostname match)
    if (TIKTOK_HOSTNAMES.has(hostname)) {
      if (isTikTokProfileUrl(pathname)) {
        const username = pathname.split('/').filter(Boolean)[0];
        return {
          route: 'creator_profile',
          cleanUrl: `https://www.tiktok.com/${username}`,
        };
      }
      return { route: 'unsupported', cleanUrl: url };
    }
    
    // YouTube (EXACT hostname match)
    if (YOUTUBE_HOSTNAMES.has(hostname)) {
      if (isYouTubeProfileUrl(pathname)) {
        const cleanUrl = normalizeYouTubeUrl(url, hostname, pathname);
        return { route: 'creator_profile', cleanUrl };
      }
      return { route: 'unsupported', cleanUrl: url };
    }
    
    return { route: 'unsupported', cleanUrl: url };
    
  } catch {
    return { route: 'unsupported', cleanUrl: url };
  }
}

/**
 * Normalize X/Twitter URL to consistent format
 */
function normalizeXUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    parsed.hostname = 'x.com';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return url;
  }
}

/**
 * Normalize YouTube URL to clean profile URL
 */
function normalizeYouTubeUrl(url: string, hostname: string, pathname: string): string {
  const pathParts = pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0];
  
  try {
    const base = 'https://www.youtube.com';
    
    if (firstSegment.startsWith('@')) {
      return `${base}/${firstSegment}`;
    }
    
    if (firstSegment === 'channel' || firstSegment === 'user' || firstSegment === 'c') {
      return `${base}/${firstSegment}/${pathParts[1]}`;
    }
    
    return url;
  } catch {
    return url;
  }
}

/**
 * Quick client-side classification hint (not authoritative)
 * Used for OpenClaw to know if it needs to ask for profileTags
 */
export function needsProfileTags(route: BotRoute): boolean {
  return route === 'creator_profile';
}

// ============================================================================
// Test Cases (can be used for manual verification)
// ============================================================================

/**
 * Test cases for URL classification
 * Run with: node -e "require('./classify-url').classifyUrl('https://x.com/test')"
 * 
 * Or verify with the TEST_CASES object:
 * Object.entries(TEST_CASES).forEach(([category, urls]) => {
 *   urls.forEach(url => console.log(url, '->', classifyUrl(url).route));
 * });
 */
export const TEST_CASES = {
  // X author pages - VALID
  x_author_page_valid: [
    'https://x.com/elonmusk',
    'https://x.com/elonmusk/',
    'https://twitter.com/sama',
    'https://twitter.com/username123',
    'https://x.com/user_name',
  ],
  
  // X post pages - VALID
  x_post_page_valid: [
    'https://x.com/elonmusk/status/1234567890',
    'https://twitter.com/sama/status/1234567890',
    'https://x.com/i/status/1234567890',
    'https://x.com/elonmusk/article/1234567890',
  ],
  
  // X URLs - INVALID (unsupported)
  x_unsupported: [
    'https://x.com/search?q=openai',
    'https://x.com/explore',
    'https://x.com/settings/profile',
    'https://x.com/notifications',
    'https://x.com/messages',
    // Evil domains should NOT be treated as X
    'https://evilx.com/elonmusk',  // should be unsupported (not x_author_page)
    'https://twitter.com.evil.com/elonmusk',  // should be unsupported
  ],
  
  // Instagram profiles - VALID
  instagram_profile_valid: [
    'https://www.instagram.com/nike/',
    'https://instagram.com/nike',
    'https://www.instagram.com/cristiano/',
  ],
  
  // Instagram URLs - INVALID (unsupported)
  instagram_unsupported: [
    'https://www.instagram.com/p/ABC123/',
    'https://www.instagram.com/reel/ABC123/',
    'https://www.instagram.com/reels/ABC123/',
    'https://www.instagram.com/stories/nike/123456/',
    'https://www.instagram.com/explore/',
    'https://www.instagram.com/nike/reels/',  // 2 segments - NOT valid
    'https://www.instagram.com/nike/tagged/',  // 2 segments - NOT valid
    // Evil domains should NOT be treated as Instagram
    'https://instagram.com.evil.com/nike/',  // should be unsupported
    'https://notinstagram.com/nike/',  // should be unsupported
  ],
  
  // TikTok profiles - VALID
  tiktok_profile_valid: [
    'https://www.tiktok.com/@nike',
    'https://www.tiktok.com/@mrbeast',
    'https://tiktok.com/@cristiano',
  ],
  
  // TikTok URLs - INVALID (unsupported)
  tiktok_unsupported: [
    'https://www.tiktok.com/@nike/video/1234567890',
    'https://www.tiktok.com/discover/ai',
    'https://www.tiktok.com/tag/football',
    'https://www.tiktok.com/foryou',
    // Evil domains should NOT be treated as TikTok
    'https://tiktok.com.evil.com/@nike/',  // should be unsupported
    'https://eviltiktok.com/@nike/',  // should be unsupported
  ],
  
  // YouTube profiles - VALID
  youtube_profile_valid: [
    'https://www.youtube.com/@mrbeast',
    'https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA',
    'https://www.youtube.com/user/Google',
    'https://www.youtube.com/c/GoogleDevelopers',
  ],
  
  // YouTube URLs - INVALID (unsupported)
  youtube_unsupported: [
    'https://www.youtube.com/watch?v=abc123',
    'https://www.youtube.com/shorts/abc123',
    'https://www.youtube.com/live/abc123',
    'https://www.youtube.com/@mrbeast/videos',  // 2 segments - NOT valid root profile
    'https://www.youtube.com/@mrbeast/shorts',  // 2 segments - NOT valid root profile
    'https://www.youtube.com/feed/subscriptions',
    // Evil domains should NOT be treated as YouTube
    'https://youtube.com.evil.com/@nike/',  // should be unsupported
    'https://myyoutube.com/@nike/',  // should be unsupported
  ],
};
