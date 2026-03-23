import { fetchXSources } from '@/lib/ingest/providers/x';
import { toSummaryText } from '@/lib/ingest/provider-utils';
import { resolveSourcePlatform } from '@/lib/ingest/resolver';
import {
  createIngestJob,
  updateIngestJob,
  upsertNewsItemFromSource,
  upsertSourceRecord,
} from '@/lib/ingest/persistence';
import type {
  AuthorTrackingIngestRequest,
  BatchIngestResult,
  FetchResult,
  IngestRequest,
  IngestResult,
  IngestJobRow,
  KeywordMonitoringIngestRequest,
  SingleUrlIngestRequest,
  SingleIngestResult,
  SourcePlatform,
  XIngestMode,
} from '@/lib/ingest/types';

function getMode(input: IngestRequest): XIngestMode {
  return input.mode || 'single_url';
}

function isSingleUrlRequest(input: IngestRequest): input is SingleUrlIngestRequest {
  return input.mode === undefined || input.mode === 'single_url';
}

function isAuthorTrackingRequest(input: IngestRequest): input is AuthorTrackingIngestRequest {
  return input.mode === 'author_tracking';
}

function isKeywordMonitoringRequest(input: IngestRequest): input is KeywordMonitoringIngestRequest {
  return input.mode === 'keyword_monitoring';
}

function getSourcePlatform(input: IngestRequest): SourcePlatform | null {
  if (isSingleUrlRequest(input)) {
    return input.sourcePlatform || resolveSourcePlatform(input.sourceUrl);
  }

  return input.sourcePlatform || 'x';
}

function buildJobSourceUrl(input: IngestRequest) {
  if (isSingleUrlRequest(input)) {
    return input.sourceUrl;
  }

  if (isAuthorTrackingRequest(input)) {
    const handle = input.authorUrl || input.authorHandle;
    return input.authorUrl || `https://x.com/${String(handle).trim().replace(/^@/, '')}`;
  }

  if (isKeywordMonitoringRequest(input)) {
    return `https://x.com/search?q=${encodeURIComponent(input.query)}`;
  }

  return 'https://x.com';
}

async function persistFetchResult(input: IngestRequest, fetchResult: FetchResult) {
  const { sourceRecord, existed: sourceExisted } = await upsertSourceRecord(fetchResult);
  const { newsItem, existed: newsExisted } = await upsertNewsItemFromSource({
    sourceRecord,
    requestedBy: input.requestedBy,
    ingestMethod: input.ingestMethod || 'manual',
    summaryOverride: toSummaryText(fetchResult),
  });

  return {
    sourceRecord,
    newsItem,
    deduped: sourceExisted || newsExisted,
  };
}

async function failJob(job: IngestJobRow, error: unknown): Promise<never> {
  const completedJob = await updateIngestJob(job.id, {
    status: 'failed',
    errorMessage: error instanceof Error ? error.message : 'Unknown ingest error',
  });

  throw Object.assign(error instanceof Error ? error : new Error('Unknown ingest error'), {
    jobId: completedJob.id,
  });
}

async function completeSingleUrlIngest(job: IngestJobRow, input: SingleUrlIngestRequest, fetchResult: FetchResult) {
  const persisted = await persistFetchResult(input, fetchResult);
  const completedJob = await updateIngestJob(job.id, {
    status: 'succeeded',
    sourceRecordId: persisted.sourceRecord.id,
    newsItemId: persisted.newsItem.id,
  });

  const result: SingleIngestResult = {
    mode: 'single_url',
    job: completedJob,
    sourceRecord: persisted.sourceRecord,
    newsItem: persisted.newsItem,
    deduped: persisted.deduped,
  };

  return result;
}

export async function ingestPrefetchedSingleSource(
  input: SingleUrlIngestRequest,
  fetchResult: FetchResult
): Promise<SingleIngestResult> {
  const sourcePlatform = input.sourcePlatform || resolveSourcePlatform(input.sourceUrl);

  if (!sourcePlatform) {
    throw new Error('暂时只支持已识别的平台链接，当前无法识别该 URL。');
  }

  if (fetchResult.platform !== sourcePlatform) {
    throw new Error('抓取结果的平台和来源链接不一致。');
  }

  const job = await createIngestJob({
    sourceUrl: buildJobSourceUrl(input),
    sourcePlatform,
    ingestMethod: input.ingestMethod || 'manual',
    requestedBy: input.requestedBy,
  });

  try {
    return await completeSingleUrlIngest(job, input, fetchResult);
  } catch (error) {
    return failJob(job, error);
  }
}

export async function ingestSource(input: IngestRequest): Promise<IngestResult> {
  const sourcePlatform = getSourcePlatform(input);

  if (!sourcePlatform) {
    throw new Error('暂时只支持已识别的平台链接，当前无法识别该 URL。');
  }

  const job = await createIngestJob({
    sourceUrl: buildJobSourceUrl(input),
    sourcePlatform,
    ingestMethod: input.ingestMethod || 'manual',
    requestedBy: input.requestedBy,
  });

  try {
    if (sourcePlatform !== 'x') {
      throw new Error('微信公众号导入需要由 OpenClaw 先抓取正文，再调用 bot intake 接口入库。');
    }

    const mode = getMode(input);
    const fetchResults = await fetchXSources(input);

    if (fetchResults.length === 0) {
      throw new Error('Apify 没有返回任何 X 内容。');
    }

    if (mode === 'single_url' && isSingleUrlRequest(input)) {
      return completeSingleUrlIngest(job, input, fetchResults[0]);
    }

    const items = [];
    for (const fetchResult of fetchResults) {
      items.push(await persistFetchResult(input, fetchResult));
    }

    const completedJob = await updateIngestJob(job.id, {
      status: 'succeeded',
      sourceRecordId: items[0]?.sourceRecord.id ?? null,
      newsItemId: items[0]?.newsItem.id ?? null,
    });

    const result: BatchIngestResult = {
      mode: mode as BatchIngestResult['mode'],
      job: completedJob,
      items,
      totalFetched: fetchResults.length,
      totalPersisted: items.length,
    };

    return result;
  } catch (error) {
    return failJob(job, error);
  }
}
