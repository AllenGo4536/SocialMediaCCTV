
export interface Profile {
    id: string;
    platform: 'instagram' | 'tiktok' | 'youtube';
    username: string;
    full_name?: string;
    profile_url: string;
    avatar_url?: string;
    is_verified?: boolean;
    created_at: string;
    created_by?: string;
    creator_email?: string;
    tags?: ProfileTag[];
}

export interface ProfileTag {
    id: string;
    label: string;
    group: 'benchmark_type' | 'culture' | 'content_type';
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
}
