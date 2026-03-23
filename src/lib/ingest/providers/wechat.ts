import { normalizeSourceUrl, resolveSourcePlatform } from '@/lib/ingest/resolver';
import type { FetchResult } from '@/lib/ingest/types';

export interface WechatArticlePayload {
  canonicalUrl?: string;
  title?: string;
  authorName?: string;
  publishedAt?: string;
  summary?: string;
  contentText?: string;
  coverImageUrl?: string;
  readCount?: number | string | null;
  rawPayload?: unknown;
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function getOptionalString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toExcerpt(value: string, maxLength: number) {
  const clean = compactWhitespace(value);
  if (!clean) return '';
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

function normalizeWechatUrl(input: string) {
  const url = new URL(normalizeSourceUrl(input));
  if (url.hostname === 'weixin.qq.com') {
    url.hostname = 'mp.weixin.qq.com';
  }
  return url.toString();
}

function sanitizePublishedAt(value: unknown) {
  const raw = getOptionalString(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error('wechatArticle.publishedAt 不是合法时间。');
  }
  return date.toISOString();
}

function sanitizeReadCount(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = typeof value === 'string'
    ? (() => {
        const compact = value.trim().replace(/,/g, '');
        const multiplier = compact.includes('万') ? 10000 : 1;
        return Number(compact.replace(/[^\d.]/g, '')) * multiplier;
      })()
    : Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error('wechatArticle.readCount 不是合法数字。');
  }

  return Math.round(normalized);
}

function toRawPayload(article: WechatArticlePayload, canonicalUrl: string, summary: string) {
  const normalized = {
    canonicalUrl,
    title: article.title?.trim() || null,
    authorName: article.authorName?.trim() || null,
    publishedAt: article.publishedAt?.trim() || null,
    summary,
    coverImageUrl: article.coverImageUrl?.trim() || null,
    readCount: article.readCount ?? null,
  };

  if (article.rawPayload && typeof article.rawPayload === 'object' && !Array.isArray(article.rawPayload)) {
    return {
      ...article.rawPayload,
      normalized,
    };
  }

  return {
    upstream: article.rawPayload ?? null,
    normalized,
  };
}

export function toWechatFetchResult(sourceUrl: string, article: WechatArticlePayload): FetchResult {
  const canonicalUrl = normalizeWechatUrl(article.canonicalUrl || sourceUrl);
  if (resolveSourcePlatform(canonicalUrl) !== 'wechat') {
    throw new Error('微信公众号文章链接必须是 mp.weixin.qq.com。');
  }

  const title = getOptionalString(article.title);
  if (!title) {
    throw new Error('wechatArticle.title 不能为空。');
  }

  const contentText = getOptionalString(article.contentText);
  if (!contentText) {
    throw new Error('wechatArticle.contentText 不能为空。');
  }

  const summary = getOptionalString(article.summary) || toExcerpt(contentText, 180);
  const publishedAt = sanitizePublishedAt(article.publishedAt) || new Date().toISOString();
  const readCount = sanitizeReadCount(article.readCount);
  const coverImageUrl = getOptionalString(article.coverImageUrl);
  const authorName = getOptionalString(article.authorName) || '微信公众号';

  return {
    platform: 'wechat',
    canonicalUrl,
    externalId: null,
    authorName,
    title,
    summary,
    contentText,
    coverImageUrl,
    publishedAt,
    media: null,
    metrics: readCount === null ? undefined : { read_count: readCount },
    rawPayload: toRawPayload(article, canonicalUrl, summary),
    fetchStatus: 'succeeded',
  };
}
