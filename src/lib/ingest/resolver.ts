import type { SourcePlatform } from '@/lib/ingest/types';

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  const value = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(value);
}

export function resolveSourcePlatform(input: string): SourcePlatform | null {
  try {
    const url = normalizeUrl(input);
    const host = url.hostname.toLowerCase();

    if (host === 'x.com' || host === 'www.x.com' || host === 'twitter.com' || host === 'www.twitter.com') {
      return 'x';
    }

    if (host === 'mp.weixin.qq.com') {
      return 'wechat';
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizeSourceUrl(input: string) {
  const url = normalizeUrl(input);
  url.hash = '';
  return url.toString();
}
