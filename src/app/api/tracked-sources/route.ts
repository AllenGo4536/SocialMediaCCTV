import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-utils';
import { ingestSource } from '@/lib/ingest/service';
import { listTrackedSources, upsertTrackedSource } from '@/lib/ingest/persistence';
import { isSupabaseServerConfigured } from '@/lib/supabase';

function normalizeHandle(input: string) {
  return input.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').split('/')[0] || '';
}

export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 环境变量未配置，当前无法读取监控列表。' },
      { status: 500 }
    );
  }

  try {
    const items = await listTrackedSources();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, '读取监控列表失败') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 环境变量未配置，当前无法写入监控列表。' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const authorUrl = String(body?.authorUrl || '').trim();
    const requestedBy = String(body?.requestedBy || 'team@virax.local').trim();
    const handle = normalizeHandle(authorUrl);

    if (!authorUrl || !handle) {
      return NextResponse.json({ error: '请提供有效的 X 博主主页链接。' }, { status: 400 });
    }

    const result = await ingestSource({
      mode: 'author_tracking',
      authorHandle: handle,
      authorUrl,
      sourcePlatform: 'x',
      requestedBy,
      ingestMethod: 'auto_tracked',
      sort: 'Latest',
      maxItems: 10,
    });

    if (result.mode === 'single_url') {
      return NextResponse.json({ error: '监控列表写入失败。' }, { status: 500 });
    }

    const latestItem = result.items[0];
    const trackedSource = await upsertTrackedSource({
      handle,
      authorUrl,
      displayName: latestItem?.sourceRecord.author_name || `@${handle}`,
      latestHeadline: latestItem?.newsItem.title || null,
      latestSourceRecordId: latestItem?.sourceRecord.id || null,
      createdBy: requestedBy,
    });

    return NextResponse.json({
      item: trackedSource,
      totalPersisted: result.totalPersisted,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, '写入监控列表失败') },
      { status: 500 }
    );
  }
}
