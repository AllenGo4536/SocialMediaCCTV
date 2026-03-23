import type { NewsItem } from '@/types';
import { supabaseAdmin } from '@/lib/supabase';
import type {
  FetchResult,
  IngestJobRow,
  IngestJobStatus,
  NewsItemRow,
  SourcePlatform,
  SourceRecordRow,
  TrackedSourceRow,
} from '@/lib/ingest/types';
import type { TrackedSource } from '@/types';

function toNewsItem(row: NewsItemRow): NewsItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    cover_image_url: row.cover_image_url || undefined,
    source_platform: row.source_platform,
    source_url: row.source_url,
    author_name: row.author_name,
    published_at: row.published_at,
    ingest_method: row.ingest_method,
    status: row.status,
    created_by: row.created_by,
    updated_by: row.updated_by,
    tags: row.tags || undefined,
    is_top_story: row.is_top_story,
    source_metadata: row.source_metadata || undefined,
  };
}

export async function listNewsItems(filters?: {
  status?: string;
  platform?: SourcePlatform;
}) {
  let query = supabaseAdmin
    .from('news_items')
    .select('*')
    .order('published_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.platform) {
    query = query.eq('source_platform', filters.platform);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data || []) as NewsItemRow[]).map(toNewsItem);
}

export async function createIngestJob(input: {
  sourceUrl: string;
  sourcePlatform: SourcePlatform;
  ingestMethod: string;
  requestedBy: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('ingest_jobs')
    .insert({
      source_url: input.sourceUrl,
      source_platform: input.sourcePlatform,
      ingest_method: input.ingestMethod,
      requested_by: input.requestedBy,
      status: 'running',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as IngestJobRow;
}

export async function updateIngestJob(jobId: string, input: {
  status: IngestJobStatus;
  errorMessage?: string | null;
  sourceRecordId?: string | null;
  newsItemId?: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from('ingest_jobs')
    .update({
      status: input.status,
      error_message: input.errorMessage ?? null,
      source_record_id: input.sourceRecordId ?? null,
      news_item_id: input.newsItemId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select('*')
    .single();

  if (error) throw error;
  return data as IngestJobRow;
}

export async function upsertSourceRecord(result: FetchResult) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('source_records')
    .select('*')
    .eq('platform', result.platform)
    .eq('canonical_url', result.canonicalUrl)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    platform: result.platform,
    external_id: result.externalId ?? null,
    canonical_url: result.canonicalUrl,
    author_name: result.authorName ?? null,
    title: result.title ?? null,
    published_at: result.publishedAt ?? null,
    content_text: result.contentText ?? null,
    cover_image_url: result.coverImageUrl ?? null,
    media: result.media ?? null,
    metrics: result.metrics ?? null,
    raw_payload: result.rawPayload,
    fetch_status: result.fetchStatus,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('source_records')
      .update(payload)
      .eq('id', (existing as SourceRecordRow).id)
      .select('*')
      .single();

    if (error) throw error;
    return { sourceRecord: data as SourceRecordRow, existed: true };
  }

  const { data, error } = await supabaseAdmin
    .from('source_records')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return { sourceRecord: data as SourceRecordRow, existed: false };
}

export async function upsertNewsItemFromSource(input: {
  sourceRecord: SourceRecordRow;
  requestedBy: string;
  ingestMethod: string;
  summaryOverride?: string;
}) {
  const { sourceRecord, requestedBy, ingestMethod, summaryOverride } = input;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('news_items')
    .select('*')
    .eq('source_record_id', sourceRecord.id)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    source_record_id: sourceRecord.id,
    title: sourceRecord.title || '未命名资讯',
    summary: summaryOverride || sourceRecord.content_text || sourceRecord.title || '暂无摘要',
    source_platform: sourceRecord.platform,
    source_url: sourceRecord.canonical_url,
    author_name: sourceRecord.author_name || '未知作者',
    published_at: sourceRecord.published_at || new Date().toISOString(),
    cover_image_url: sourceRecord.cover_image_url,
    ingest_method: ingestMethod,
    status: 'pending',
    created_by: existing ? (existing as NewsItemRow).created_by : requestedBy,
    updated_by: requestedBy,
    tags: sourceRecord.platform === 'x' ? ['X 导入'] : ['公众号导入'],
    is_top_story: existing ? (existing as NewsItemRow).is_top_story : false,
    source_metadata: {
      external_id: sourceRecord.external_id,
      fetch_status: sourceRecord.fetch_status,
      ...(sourceRecord.metrics || {}),
    },
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('news_items')
      .update(payload)
      .eq('id', (existing as NewsItemRow).id)
      .select('*')
      .single();

    if (error) throw error;
    return { newsItem: toNewsItem(data as NewsItemRow), existed: true };
  }

  const { data, error } = await supabaseAdmin
    .from('news_items')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return { newsItem: toNewsItem(data as NewsItemRow), existed: false };
}

export async function createManualNewsItem(input: {
  title: string;
  summary: string;
  sourceUrl: string;
  coverImageUrl?: string;
  sourcePlatform: SourcePlatform;
  authorName: string;
  publishedAt: string;
  status: string;
  requestedBy: string;
}) {
  const { data: sourceData, error: sourceError } = await supabaseAdmin
    .from('source_records')
    .insert({
      platform: input.sourcePlatform,
      canonical_url: input.sourceUrl,
      author_name: input.authorName,
      title: input.title,
      published_at: input.publishedAt,
      content_text: input.summary,
      cover_image_url: input.coverImageUrl || null,
      media: null,
      metrics: null,
      raw_payload: {
        source: 'manual-entry',
      },
      fetch_status: 'partial',
    })
    .select('*')
    .single();

  if (sourceError) throw sourceError;

  const { data, error } = await supabaseAdmin
    .from('news_items')
    .insert({
      source_record_id: (sourceData as SourceRecordRow).id,
      title: input.title,
      summary: input.summary,
      source_platform: input.sourcePlatform,
      source_url: input.sourceUrl,
      author_name: input.authorName,
      published_at: input.publishedAt,
      cover_image_url: input.coverImageUrl || null,
      ingest_method: 'manual',
      status: input.status,
      created_by: input.requestedBy,
      updated_by: input.requestedBy,
      tags: input.sourcePlatform === 'x' ? ['手工补录'] : ['公众号摘录'],
      is_top_story: false,
      source_metadata: {
        source: 'manual-entry',
      },
    })
    .select('*')
    .single();

  if (error) throw error;
  return toNewsItem(data as NewsItemRow);
}

function toTrackedSource(row: TrackedSourceRow): TrackedSource {
  return {
    id: row.id,
    platform: row.platform,
    handle: row.handle,
    display_name: row.display_name,
    status: row.status,
    last_checked_at: row.last_checked_at,
    latest_headline: row.latest_headline || '等待下一次抓取。',
    created_by: row.created_by,
  };
}

export async function listTrackedSources() {
  const { data, error } = await supabaseAdmin
    .from('tracked_sources')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data || []) as TrackedSourceRow[]).map(toTrackedSource);
}

export async function listActiveTrackedSources() {
  const { data, error } = await supabaseAdmin
    .from('tracked_sources')
    .select('*')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as TrackedSourceRow[];
}

export async function upsertTrackedSource(input: {
  handle: string;
  authorUrl: string;
  displayName: string;
  latestHeadline?: string | null;
  latestSourceRecordId?: string | null;
  createdBy: string;
}) {
  const normalizedHandle = input.handle.trim().replace(/^@/, '').toLowerCase();

  const payload = {
    platform: 'x',
    handle: `@${normalizedHandle}`,
    author_url: input.authorUrl,
    display_name: input.displayName,
    status: 'active',
    last_checked_at: new Date().toISOString(),
    latest_headline: input.latestHeadline ?? null,
    latest_source_record_id: input.latestSourceRecordId ?? null,
    created_by: input.createdBy,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('tracked_sources')
    .upsert(payload, { onConflict: 'handle' })
    .select('*')
    .single();

  if (error) throw error;
  return toTrackedSource(data as TrackedSourceRow);
}

export async function markTrackedSourceChecked(input: {
  id: string;
  latestHeadline?: string | null;
  latestSourceRecordId?: string | null;
  displayName?: string;
}) {
  const payload: {
    last_checked_at: string;
    updated_at: string;
    latest_headline?: string | null;
    latest_source_record_id?: string | null;
    display_name?: string;
  } = {
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (input.latestHeadline !== undefined) {
    payload.latest_headline = input.latestHeadline;
  }
  if (input.latestSourceRecordId !== undefined) {
    payload.latest_source_record_id = input.latestSourceRecordId;
  }
  if (input.displayName !== undefined) {
    payload.display_name = input.displayName;
  }

  const { data, error } = await supabaseAdmin
    .from('tracked_sources')
    .update(payload)
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) throw error;
  return toTrackedSource(data as TrackedSourceRow);
}

export async function updateNewsItemRecord(id: string, input: {
  title: string;
  summary: string;
  sourceUrl: string;
  coverImageUrl?: string;
  sourcePlatform: SourcePlatform;
  authorName: string;
  publishedAt: string;
  status: string;
  updatedBy: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('news_items')
    .update({
      title: input.title,
      summary: input.summary,
      source_url: input.sourceUrl,
      cover_image_url: input.coverImageUrl || null,
      source_platform: input.sourcePlatform,
      author_name: input.authorName,
      published_at: input.publishedAt,
      status: input.status,
      updated_by: input.updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return toNewsItem(data as NewsItemRow);
}

export async function deleteNewsItemRecord(id: string) {
  const { error } = await supabaseAdmin.from('news_items').delete().eq('id', id);
  if (error) throw error;
}
