
export interface Profile {
    id: string;
    platform: 'instagram' | 'tiktok' | 'youtube';
    username: string;
    full_name?: string;
    profile_url: string;
    avatar_url?: string;
    is_verified?: boolean;
    biography?: string;
    external_url?: string;
    followers_count?: number;
    follows_count?: number;
    profile_posts_count?: number;
    is_private?: boolean;
    is_business_account?: boolean;
    business_category_name?: string;
    profile_scraped_at?: string;
    created_at: string;
    created_by?: string;
    creator_email?: string;
    post_count?: number;
    last_scraped_at?: string;
    tags?: ProfileTag[];
    ai_tags?: AiProfileTag[];
    ai_summary?: AiProfileSummary | null;
}

export interface ProfileTag {
    id: string;
    label: string;
    group: 'benchmark_type' | 'culture' | 'content_type';
}

export interface AiProfileTag {
    id: string;
    label: string;
    group: 'content_theme' | 'content_format' | 'tool_signal' | 'commercial_signal';
    confidence?: number | null;
}

export interface AiProfileSummary {
    summary: string;
    analyzed_post_count: number;
    top_keywords: string[];
    source_version: string;
    generated_at: string;
}

export interface Post {
    id: string;
    platform: 'instagram' | 'tiktok' | 'youtube';
    external_id: string;
    short_code?: string;
    type: 'Image' | 'Video' | 'Sidecar';
    caption?: string;
    display_url: string;
    video_url?: string;
    permalink: string;

    like_count: number;
    comment_count: number;
    video_view_count?: number;
    video_play_count?: number;

    hashtags?: string[];
    is_pinned?: boolean;
    posted_at: string;

    // Joined fields
    profiles?: Profile;
}

export type NewsSourcePlatform = 'x' | 'wechat';
export type NewsIngestMethod = 'manual' | 'auto_tracked';
export type NewsStatus = 'pending' | 'featured' | 'ignored';

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    cover_image_url?: string;
    source_platform: NewsSourcePlatform;
    source_url: string;
    author_name: string;
    published_at: string;
    ingest_method: NewsIngestMethod;
    status: NewsStatus;
    created_by: string;
    updated_by: string;
    tags?: string[];
    is_top_story?: boolean;
    source_metadata?: Record<string, string | number | boolean | null>;
}

export interface TrackedSource {
    id: string;
    platform: 'x';
    handle: string;
    display_name: string;
    status: 'active' | 'paused';
    last_checked_at: string;
    latest_headline: string;
    created_by: string;
}
