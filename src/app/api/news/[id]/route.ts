import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-utils';
import { deleteNewsItemRecord, updateNewsItemRecord } from '@/lib/ingest/persistence';
import { isSupabaseServerConfigured } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 环境变量未配置，当前无法更新资讯。' },
      { status: 500 }
    );
  }

  try {
    const { id } = await context.params;
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

    const item = await updateNewsItemRecord(id, {
      title,
      summary,
      sourceUrl,
      coverImageUrl: String(body?.cover_image_url || '').trim() || undefined,
      sourcePlatform: body?.source_platform === 'x' ? 'x' : 'wechat',
      authorName,
      publishedAt: new Date(String(body?.published_at || new Date().toISOString())).toISOString(),
      status: body?.status === 'featured' || body?.status === 'ignored' ? body.status : 'pending',
      updatedBy: String(body?.updatedBy || 'team@virax.local').trim(),
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, '更新资讯失败') },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 环境变量未配置，当前无法删除资讯。' },
      { status: 500 }
    );
  }

  try {
    const { id } = await context.params;
    await deleteNewsItemRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, '删除资讯失败') },
      { status: 500 }
    );
  }
}
