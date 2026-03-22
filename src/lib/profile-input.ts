import type { Platform } from '@/lib/taxonomy';

interface ParsedProfileInput {
  username: string;
  profileUrl: string;
}

function normalizeInput(input: string) {
  return input.trim();
}

function tryParseUrl(value: string): URL | null {
  try {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return new URL(value);
    }
    return null;
  } catch {
    return null;
  }
}

function parseInstagram(input: string): ParsedProfileInput | null {
  const value = normalizeInput(input).replace(/^@/, '');
  const parsed = tryParseUrl(value);
  let username = value;

  if (parsed) {
    if (!parsed.hostname.includes('instagram.com')) return null;
    username = parsed.pathname.split('/').filter(Boolean)[0] || '';
  }

  username = username.replace(/^@/, '').trim();
  if (!username) return null;

  return {
    username,
    profileUrl: `https://www.instagram.com/${username}/`,
  };
}

function parseTikTok(input: string): ParsedProfileInput | null {
  const value = normalizeInput(input);
  const parsed = tryParseUrl(value);
  let username = value.replace(/^@/, '');

  if (parsed) {
    if (!parsed.hostname.includes('tiktok.com')) return null;
    const first = parsed.pathname.split('/').filter(Boolean)[0] || '';
    username = first.startsWith('@') ? first.slice(1) : first;
  }

  username = username.replace(/^@/, '').trim();
  if (!username) return null;

  return {
    username,
    profileUrl: `https://www.tiktok.com/@${username}`,
  };
}

function parseYoutube(input: string): ParsedProfileInput | null {
  const value = normalizeInput(input);
  const parsed = tryParseUrl(value);
  let username = value.trim();
  let profileUrl = `https://www.youtube.com/@${username.replace(/^@/, '')}`;

  if (parsed) {
    const isYoutubeHost = parsed.hostname.includes('youtube.com');
    if (!isYoutubeHost) return null;

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) return null;

    if (pathParts[0].startsWith('@')) {
      username = pathParts[0].slice(1);
      profileUrl = `https://www.youtube.com/@${username}`;
    } else if (
      (pathParts[0] === 'channel' || pathParts[0] === 'user' || pathParts[0] === 'c') &&
      pathParts[1]
    ) {
      username = `${pathParts[0]}:${pathParts[1]}`;
      profileUrl = `https://www.youtube.com/${pathParts[0]}/${pathParts[1]}`;
    } else {
      // Only channel pages are supported for YouTube.
      return null;
    }
  } else if (value.startsWith('@')) {
    username = value.slice(1);
    profileUrl = `https://www.youtube.com/@${username}`;
  } else {
    profileUrl = `https://www.youtube.com/@${username}`;
  }

  username = username.trim();
  if (!username) return null;

  return { username, profileUrl };
}

export function parseProfileInput(platform: Platform, input: string): ParsedProfileInput | null {
  if (platform === 'instagram') return parseInstagram(input);
  if (platform === 'tiktok') return parseTikTok(input);
  return parseYoutube(input);
}

export function detectPlatformFromProfileUrl(input: string): Platform | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();

    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';

    return null;
  } catch {
    return null;
  }
}
