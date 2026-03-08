
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
