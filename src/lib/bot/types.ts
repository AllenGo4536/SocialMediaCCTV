import type { WechatArticlePayload } from '@/lib/ingest/providers/wechat';

/**
 * Bot Intake Types
 * Shared types for the OpenClaw bot integration
 */

export type BotRoute = 'x_author_page' | 'x_post_page' | 'wechat_article' | 'creator_profile' | 'unsupported';

export interface BotRequestContext {
  channel?: string;
  conversationId?: string;
  messageId?: string;
}

export interface ProfileTags {
  benchmarkType?: string;
  cultureTags?: string[];
  contentTags?: string[];
}

export interface BotIntakeRequest {
  url: string;
  requestedBy: string;
  context?: BotRequestContext;
  profileTags?: ProfileTags;
  wechatArticle?: WechatArticlePayload;
}

export interface BotIntakeSuccessData {
  jobId?: string;
  newsItemId?: string;
  deduped?: boolean;
  trackedSourceId?: string;
  totalPersisted?: number;
  profileId?: string;
  platform?: string;
}

export interface BotIntakeResponse {
  route: BotRoute;
  status: 'completed' | 'accepted' | 'rejected';
  message: string;
  data?: BotIntakeSuccessData;
  missingTags?: string[];
}
