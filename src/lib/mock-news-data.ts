import type { NewsSourcePlatform } from '@/types';

export function getPlatformLabel(platform: NewsSourcePlatform) {
  return platform === 'x' ? 'X / Twitter' : '微信公众号';
}

export function isWithinDays(isoDate: string, days: number) {
  const now = Date.now();
  const target = new Date(isoDate).getTime();
  const diff = now - target;
  return diff <= days * 24 * 60 * 60 * 1000;
}
