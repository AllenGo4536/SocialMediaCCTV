import type { FetchResult } from '@/lib/ingest/types';

export function toSummaryText(fetchResult: FetchResult) {
  const summary = typeof fetchResult.summary === 'string' ? fetchResult.summary.trim() : '';
  if (summary) {
    return summary;
  }

  const contentText = typeof fetchResult.contentText === 'string' ? fetchResult.contentText.trim() : '';
  if (!contentText) {
    return undefined;
  }

  return contentText;
}
