import { apifyClient, X_SCRAPER_ACTOR_ID } from '@/lib/apify';
import { normalizeSourceUrl } from '@/lib/ingest/resolver';
import type {
  AuthorTrackingIngestRequest,
  FetchResult,
  IngestRequest,
  KeywordMonitoringIngestRequest,
  SingleUrlIngestRequest,
  XSearchSort,
} from '@/lib/ingest/types';

interface ApifyTwitterAuthor {
  userName?: string;
  url?: string;
  twitterUrl?: string;
  id?: string;
  name?: string;
  isVerified?: boolean;
  isBlueVerified?: boolean;
  profilePicture?: string;
  followers?: number;
  following?: number;
}

interface ApifyTwitterMediaObject {
  url?: string;
  media_url_https?: string;
  src?: string;
  image?: string;
  thumbnail?: string;
  previewImageUrl?: string;
  type?: string;
}

interface ApifyTwitterItem {
  type?: string;
  id?: string;
  url?: string;
  twitterUrl?: string;
  text?: string;
  fullText?: string;
  retweetCount?: number;
  replyCount?: number;
  likeCount?: number;
  quoteCount?: number;
  bookmarkCount?: number;
  viewCount?: number;
  createdAt?: string;
  lang?: string;
  isReply?: boolean;
  isRetweet?: boolean;
  isQuote?: boolean;
  inReplyToId?: string;
  inReplyToUsername?: string;
  quoteId?: string;
  conversationId?: string;
  author?: ApifyTwitterAuthor;
  photos?: ApifyTwitterMediaObject[] | string[];
  videos?: ApifyTwitterMediaObject[] | string[];
  extendedEntities?: {
    media?: ApifyTwitterMediaObject[];
  };
  media?: ApifyTwitterMediaObject[];
  searchTerm?: string;
}

interface ApifyTwitterInput {
  startUrls?: string[];
  searchTerms?: string[];
  includeSearchTerms?: boolean;
  tweetLanguage?: string;
  sort?: XSearchSort;
  maxItems?: number;
  start?: string;
  end?: string;
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function removeTrailingLinks(value: string) {
  return value.replace(/https?:\/\/\S+/gi, '').trim();
}

function toExcerpt(value: string, maxLength: number) {
  const clean = compactWhitespace(removeTrailingLinks(value));
  if (!clean) return '';

  if (clean.length <= maxLength) return clean;

  const clipped = clean.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf('。'),
    clipped.lastIndexOf('！'),
    clipped.lastIndexOf('？'),
    clipped.lastIndexOf('. '),
    clipped.lastIndexOf('! '),
    clipped.lastIndexOf('? ')
  );

  if (sentenceEnd >= Math.floor(maxLength * 0.45)) {
    return compactWhitespace(clipped.slice(0, sentenceEnd + 1));
  }

  return `${compactWhitespace(clipped)}...`;
}

function deriveTitle(text: string, fallbackAuthor: string) {
  const lines = text
    .split('\n')
    .map((line) => compactWhitespace(line))
    .filter(Boolean);

  const headlineSource = lines[0] || text || fallbackAuthor;
  return toExcerpt(headlineSource, 72) || fallbackAuthor;
}

function deriveSummary(text: string, title: string) {
  const clean = compactWhitespace(removeTrailingLinks(text));
  if (!clean) return title;
  if (clean === title) return title;
  return toExcerpt(clean, 200) || title;
}

function sanitizePublishedAt(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeHandle(input: string) {
  return input.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').split('/')[0] || '';
}

function buildSearchTermWithDateRange(base: string, since?: string, until?: string) {
  const parts = [base];
  if (since) parts.push(`since:${since}`);
  if (until) parts.push(`until:${until}`);
  return parts.join(' ');
}

function buildAuthorTrackingInput(input: AuthorTrackingIngestRequest): ApifyTwitterInput {
  const handle = normalizeHandle(input.authorHandle || input.authorUrl || '');
  if (!handle) {
    throw new Error('author_tracking 模式需要 authorHandle 或 authorUrl。');
  }

  return {
    searchTerms: [buildSearchTermWithDateRange(`from:${handle}`, input.since, input.until)],
    includeSearchTerms: true,
    tweetLanguage: input.tweetLanguage || undefined,
    sort: input.sort || 'Latest',
    maxItems: input.maxItems || 20,
  };
}

function buildKeywordMonitoringInput(input: KeywordMonitoringIngestRequest): ApifyTwitterInput {
  const query = input.query.trim();
  if (!query) {
    throw new Error('keyword_monitoring 模式需要 query。');
  }

  return {
    searchTerms: [buildSearchTermWithDateRange(query, input.since, input.until)],
    includeSearchTerms: true,
    tweetLanguage: input.tweetLanguage || undefined,
    sort: input.sort || 'Latest',
    maxItems: input.maxItems || 20,
  };
}

function buildSingleUrlInput(input: SingleUrlIngestRequest): ApifyTwitterInput {
  return {
    startUrls: [normalizeSourceUrl(input.sourceUrl)],
    maxItems: 1,
  };
}

function buildApifyInput(input: IngestRequest): ApifyTwitterInput {
  if (input.mode === undefined || input.mode === 'single_url') {
    return buildSingleUrlInput(input);
  }

  if (input.mode === 'author_tracking') {
    return buildAuthorTrackingInput(input);
  }

  return buildKeywordMonitoringInput(input as KeywordMonitoringIngestRequest);
}

function isReplyLikeItem(item: ApifyTwitterItem) {
  return Boolean(
    item.isReply
    || item.inReplyToId
    || item.inReplyToUsername
  );
}

function shouldKeepItem(item: ApifyTwitterItem, input: IngestRequest) {
  if (input.mode === undefined || input.mode === 'single_url') {
    return true;
  }

  if (item.isRetweet) {
    return false;
  }

  if (isReplyLikeItem(item)) {
    return false;
  }

  return true;
}

function objectMediaUrls(items: Array<ApifyTwitterMediaObject | string> | undefined, fallbackType: string) {
  return (items || [])
    .map((item) => {
      if (typeof item === 'string') {
        return {
          type: fallbackType,
          url: item,
        };
      }

      const url = item.url || item.media_url_https || item.src || item.image || item.thumbnail || item.previewImageUrl;
      if (!url) return null;

      return {
        type: item.type || fallbackType,
        url,
      };
    })
    .filter((item): item is { type: string; url: string } => Boolean(item?.url));
}

function extractMedia(item: ApifyTwitterItem) {
  const photos = objectMediaUrls(item.photos, 'photo');
  const videos = objectMediaUrls(item.videos, 'video');
  const media = objectMediaUrls(item.media, 'media');
  const extended = objectMediaUrls(item.extendedEntities?.media, 'media');
  return [...photos, ...videos, ...media, ...extended];
}

function extractCanonicalUrl(item: ApifyTwitterItem, fallbackUrl?: string) {
  const candidate = item.url || item.twitterUrl || fallbackUrl;
  if (!candidate) {
    throw new Error('Apify 返回的 X 数据缺少 URL。');
  }

  return normalizeSourceUrl(candidate);
}

function formatAuthor(author: ApifyTwitterAuthor | undefined) {
  if (!author) return 'X 作者';
  if (author.name?.trim()) {
    return author.userName?.trim() ? `${author.name} (@${author.userName})` : author.name;
  }
  if (author.userName?.trim()) return `@${author.userName}`;
  return 'X 作者';
}

function mapApifyItemToFetchResult(item: ApifyTwitterItem, fallbackUrl?: string): FetchResult {
  const text = item.text?.trim() || '';
  const authorName = formatAuthor(item.author);
  const title = deriveTitle(text, authorName);
  const summary = deriveSummary(text, title);
  const media = extractMedia(item);
  const coverImageUrl = media[0]?.url || item.author?.profilePicture || null;

  return {
    platform: 'x',
    canonicalUrl: extractCanonicalUrl(item, fallbackUrl),
    externalId: item.id || null,
    authorName,
    title,
    summary,
    contentText: text || null,
    coverImageUrl,
    publishedAt: sanitizePublishedAt(item.createdAt) || new Date().toISOString(),
    media: media.length > 0 ? media : null,
    metrics: {
      reply_count: item.replyCount ?? null,
      retweet_count: item.retweetCount ?? null,
      like_count: item.likeCount ?? null,
      quote_count: item.quoteCount ?? null,
      view_count: item.viewCount ?? null,
      bookmark_count: item.bookmarkCount ?? null,
      author_followers: item.author?.followers ?? null,
      author_following: item.author?.following ?? null,
    },
    rawPayload: item,
    fetchStatus: text ? 'succeeded' : 'partial',
  };
}

function toFriendlyErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (!process.env.APIFY_API_TOKEN) {
    return 'X 抓取失败：缺少 APIFY_API_TOKEN。';
  }

  return `X 抓取失败：${message || '未知错误'}`;
}

export async function fetchXSources(input: IngestRequest): Promise<FetchResult[]> {
  try {
    const runInput = buildApifyInput(input);
    const run = await apifyClient.actor(X_SCRAPER_ACTOR_ID).call(runInput);

    if (!run.defaultDatasetId) {
      throw new Error('Apify 运行完成但没有返回 dataset。');
    }

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    const rawItems = (items || []) as ApifyTwitterItem[];

    if (rawItems.length === 0) {
      return [];
    }

    const filteredItems = rawItems.filter((item) => shouldKeepItem(item, input));
    if (filteredItems.length === 0) {
      throw new Error('当前抓到的内容全部是回复帖或转推，已按规则过滤。');
    }

    const fallbackUrl = 'sourceUrl' in input ? input.sourceUrl : undefined;
    return filteredItems.map((item) => mapApifyItemToFetchResult(item, fallbackUrl));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error));
  }
}
