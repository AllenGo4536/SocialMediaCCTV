import type { NewsIngestMethod, NewsItem, NewsSourcePlatform, NewsStatus } from '@/types';

export type SourcePlatform = NewsSourcePlatform;
export type SourceFetchStatus = 'succeeded' | 'partial' | 'failed';
export type IngestJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type XIngestMode = 'single_url' | 'author_tracking' | 'keyword_monitoring';
export type XSearchSort = 'Top' | 'Latest' | 'Latest + Top';

interface IngestBaseRequest {
  sourcePlatform?: SourcePlatform;
  requestedBy: string;
  ingestMethod?: NewsIngestMethod;
  notes?: string;
  maxItems?: number;
  sort?: XSearchSort;
  tweetLanguage?: string;
}

export interface SingleUrlIngestRequest extends IngestBaseRequest {
  mode?: 'single_url';
  sourceUrl: string;
}

export interface AuthorTrackingIngestRequest extends IngestBaseRequest {
  mode: 'author_tracking';
  authorHandle: string;
  authorUrl?: string;
  since?: string;
  until?: string;
}

export interface KeywordMonitoringIngestRequest extends IngestBaseRequest {
  mode: 'keyword_monitoring';
  query: string;
  since?: string;
  until?: string;
}

export type IngestRequest =
  | SingleUrlIngestRequest
  | AuthorTrackingIngestRequest
  | KeywordMonitoringIngestRequest;

export interface FetchResult {
  platform: SourcePlatform;
  canonicalUrl: string;
  externalId?: string | null;
  authorName?: string | null;
  title?: string | null;
  summary?: string | null;
  contentText?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  media?: unknown[] | null;
  metrics?: Record<string, number | null | undefined>;
  rawPayload: unknown;
  fetchStatus: SourceFetchStatus;
}

export interface SourceRecordRow {
  id: string;
  platform: SourcePlatform;
  external_id: string | null;
  canonical_url: string;
  author_name: string | null;
  title: string | null;
  published_at: string | null;
  content_text: string | null;
  cover_image_url: string | null;
  media: unknown[] | null;
  metrics: Record<string, number | null | undefined> | null;
  raw_payload: unknown;
  fetch_status: SourceFetchStatus;
  created_at: string;
  updated_at: string;
}

export interface NewsItemRow {
  id: string;
  source_record_id: string;
  title: string;
  summary: string;
  source_platform: SourcePlatform;
  source_url: string;
  author_name: string;
  published_at: string;
  cover_image_url: string | null;
  ingest_method: NewsIngestMethod;
  status: NewsStatus;
  created_by: string;
  updated_by: string;
  tags: string[] | null;
  is_top_story: boolean;
  source_metadata: Record<string, string | number | boolean | null> | null;
  created_at: string;
  updated_at: string;
}

export interface IngestJobRow {
  id: string;
  source_url: string;
  source_platform: SourcePlatform;
  ingest_method: NewsIngestMethod;
  requested_by: string;
  status: IngestJobStatus;
  error_message: string | null;
  source_record_id: string | null;
  news_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackedSourceRow {
  id: string;
  platform: 'x';
  handle: string;
  author_url: string;
  display_name: string;
  status: 'active' | 'paused';
  last_checked_at: string;
  latest_headline: string | null;
  latest_source_record_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SingleIngestResult {
  mode: 'single_url';
  job: IngestJobRow;
  sourceRecord: SourceRecordRow;
  newsItem: NewsItem;
  deduped: boolean;
}

export interface BatchIngestResult {
  mode: Exclude<XIngestMode, 'single_url'>;
  job: IngestJobRow;
  items: Array<{
    sourceRecord: SourceRecordRow;
    newsItem: NewsItem;
    deduped: boolean;
  }>;
  totalFetched: number;
  totalPersisted: number;
}

export type IngestResult = SingleIngestResult | BatchIngestResult;
