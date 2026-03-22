import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-utils';
import { createManualNewsItem, listNewsItems } from '@/lib/ingest/persistence';
import { isSupabaseServerConfigured } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 环境变量未配置，当前无法读取资讯。' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const items = await listNewsItems({
      status,
      platform: platform === 'x' || platform === 'wechat' ? platform : undefined,
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, '读取资讯失败') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 环境变量未配置，当前无法入库。' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const title = String(body?.title || '').trim();
    const summary = String(body?.summary || '').trim();
    const sourceUrl = String(body?.source_url || '').trim();
    const authorName = String(body?.author_name || '').trim();

    if (!title || !summary || !sourceUrl || !authorName) {
      return NextResponse.json(
        { error: '标题、摘要、原文链接、作者名都不能为空。' },
        { status: 400 }
      );
    }

    const item = await createManualNewsItem({
      title,
      summary,
      sourceUrl,
      coverImageUrl: String(body?.cover_image_url || '').trim() || undefined,
      sourcePlatform: body?.source_platform === 'x' ? 'x' : 'wechat',
      authorName,
      publishedAt: new Date(String(body?.published_at || new Date().toISOString())).toISOString(),
      status: body?.status === 'featured' || body?.status === 'ignored' ? body.status : 'pending',
      requestedBy: String(body?.requestedBy || 'team@virax.local').trim(),
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, '创建资讯失败') },
      { status: 500 }
    );
  }
}
