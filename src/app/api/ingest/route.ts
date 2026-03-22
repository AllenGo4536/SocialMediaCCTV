import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-utils';
import { ingestSource } from '@/lib/ingest/service';
import { isSupabaseServerConfigured } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 环境变量未配置，当前无法入库。' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const mode = body?.mode === 'author_tracking' || body?.mode === 'keyword_monitoring'
      ? body.mode
      : 'single_url';
    const sourceUrl = String(body?.sourceUrl || '').trim();
    const sourcePlatform = body?.sourcePlatform === 'x' || body?.sourcePlatform === 'wechat'
      ? body.sourcePlatform
      : undefined;
    const requestedBy = String(body?.requestedBy || 'team@virax.local').trim();
    const ingestMethod = body?.ingestMethod === 'auto_tracked' ? 'auto_tracked' : 'manual';
    const sort = body?.sort === 'Top' || body?.sort === 'Latest + Top' ? body.sort : 'Latest';
    const maxItems = Number.isFinite(Number(body?.maxItems)) ? Math.max(1, Number(body.maxItems)) : undefined;
    const tweetLanguage = typeof body?.tweetLanguage === 'string' ? body.tweetLanguage.trim() : undefined;

    if (mode === 'single_url' && !sourceUrl) {
      return NextResponse.json({ error: '请提供来源链接。' }, { status: 400 });
    }

    const result = await ingestSource(
      mode === 'author_tracking'
        ? {
            mode,
            authorHandle: String(body?.authorHandle || '').trim(),
            authorUrl: typeof body?.authorUrl === 'string' ? body.authorUrl.trim() : undefined,
            sourcePlatform,
            requestedBy,
            ingestMethod,
            sort,
            maxItems,
            tweetLanguage,
            since: typeof body?.since === 'string' ? body.since.trim() : undefined,
            until: typeof body?.until === 'string' ? body.until.trim() : undefined,
          }
        : mode === 'keyword_monitoring'
          ? {
              mode,
              query: String(body?.query || '').trim(),
              sourcePlatform,
              requestedBy,
              ingestMethod,
              sort,
              maxItems,
              tweetLanguage,
              since: typeof body?.since === 'string' ? body.since.trim() : undefined,
              until: typeof body?.until === 'string' ? body.until.trim() : undefined,
            }
          : {
              mode: 'single_url',
              sourceUrl,
              sourcePlatform,
              requestedBy,
              ingestMethod,
            }
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error, '导入失败');
    return NextResponse.json(
      {
        error: message,
        jobId: error && typeof error === 'object' && 'jobId' in error ? error.jobId : null,
      },
      { status: 500 }
    );
  }
}
