
import { useEffect, useState } from 'react';
import { Post } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Play, Layers, ExternalLink, Eye } from 'lucide-react';
import { useVideoPlayback } from '@/contexts/video-playback-context';

interface PostCardProps {
    post: Post;
    priority?: boolean;
}

function extractTikTokVideoId(url: string | undefined, fallbackId: string | undefined): string | null {
    if (url) {
        try {
            const parsed = new URL(url);
            const pathParts = parsed.pathname.split('/').filter(Boolean);
            const videoIdx = pathParts.findIndex((part) => part === 'video');
            if (videoIdx >= 0 && pathParts[videoIdx + 1]) {
                return pathParts[videoIdx + 1];
            }
        } catch {
            // Ignore malformed URLs and fallback to external id below.
        }
    }

    if (fallbackId && /^\d+$/.test(fallbackId)) {
        return fallbackId;
    }

    return null;
}

function extractYouTubeVideoId(url: string | undefined, fallbackId: string | undefined): string | null {
    if (url) {
        try {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();
            if (host === 'youtu.be') {
                const shortId = parsed.pathname.split('/').filter(Boolean)[0];
                if (shortId) return shortId;
            }

            const vParam = parsed.searchParams.get('v');
            if (vParam) return vParam;

            const pathParts = parsed.pathname.split('/').filter(Boolean);
            if (pathParts[0] === 'shorts' && pathParts[1]) return pathParts[1];
            if (pathParts[0] === 'embed' && pathParts[1]) return pathParts[1];
        } catch {
            // Ignore malformed URLs and fallback to external id below.
        }
    }

    if (fallbackId && /^[a-zA-Z0-9_-]{6,}$/.test(fallbackId)) {
        return fallbackId;
    }

    return null;
}

function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // If less than 24h
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours}小时前`;
    }
    // If less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days}天前`;
    }
    return date.toLocaleDateString('zh-CN');
}

export function PostCard({ post, priority = false }: PostCardProps) {
    const isVideo = post.type === 'Video';
    const isSidecar = post.type === 'Sidecar';
    const platform = post.profiles?.platform || post.platform;
    const { playingId, setPlayingId } = useVideoPlayback();
    const isPlaying = playingId === post.id;
    const displayUrl = post.display_url || '';
    const proxiedImageUrl = `/api/proxy/image?url=${encodeURIComponent(displayUrl)}`;

    // Instagram cover URLs are more stable via proxy. Other platforms try direct fetch first for better latency.
    const initialImageSrc = platform === 'instagram' ? proxiedImageUrl : displayUrl || proxiedImageUrl;
    const [coverImageSrc, setCoverImageSrc] = useState(initialImageSrc);

    useEffect(() => {
        setCoverImageSrc(initialImageSrc);
    }, [initialImageSrc]);

    const youtubeVideoId = extractYouTubeVideoId(post.permalink, post.external_id);
    const tiktokVideoId = extractTikTokVideoId(post.permalink, post.external_id);
    const youtubeEmbedUrl = youtubeVideoId
        ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&playsinline=1&rel=0`
        : null;
    const tiktokPlayerUrl = tiktokVideoId
        ? `https://www.tiktok.com/player/v1/${tiktokVideoId}?autoplay=1&description=0&controls=1`
        : null;
    const proxiedVideoUrl = post.video_url
        ? `/api/proxy/video?url=${encodeURIComponent(post.video_url)}`
        : null;

    const playerMode =
        !isVideo
            ? null
            : platform === 'youtube' && youtubeEmbedUrl
                ? 'embed'
                : proxiedVideoUrl
                    ? 'video'
                    : platform === 'tiktok' && tiktokPlayerUrl
                        ? 'embed'
                        : null;
    const playerSrc =
        playerMode === 'video'
            ? proxiedVideoUrl
            : platform === 'youtube'
                ? youtubeEmbedUrl
                : tiktokPlayerUrl;
    const canPlay = Boolean(playerMode && playerSrc);

    const handlePlay = (e: React.MouseEvent) => {
        if (canPlay) {
            e.preventDefault();
            setPlayingId(post.id);
        }
    };

    const platformLabel =
        platform === 'tiktok'
            ? 'TikTok'
            : platform === 'youtube'
                ? 'YouTube'
                : 'Instagram';
    const profileLink = post.profiles?.profile_url || post.permalink;
    const previewTags = post.profiles?.tags?.slice(0, 2) || [];

    return (
        <Card className="overflow-hidden h-full flex flex-col border border-border bg-card shadow-sm rounded-xl group transition-all hover:shadow-md">
            {/* Cover Image */}
            <CardContent
                className={`p-0 relative aspect-[4/5] bg-muted ${canPlay ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={handlePlay}
            >
                {isPlaying && playerMode === 'video' && playerSrc ? (
                    <video
                        src={playerSrc}
                        className="w-full h-full object-cover"
                        controls
                        autoPlay
                        playsInline
                        loop
                    />
                ) : isPlaying && playerMode === 'embed' && playerSrc ? (
                    <iframe
                        src={playerSrc}
                        title={post.caption || `${platformLabel} video`}
                        className="w-full h-full border-0"
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                ) : (
                    <img
                        src={coverImageSrc}
                        alt={post.caption || `${platformLabel} Post`}
                        className="object-cover w-full h-full transition-opacity group-hover:opacity-90"
                        referrerPolicy="no-referrer"
                        loading={priority ? 'eager' : 'lazy'}
                        fetchPriority={priority ? 'high' : 'auto'}
                        onError={() => {
                            if (coverImageSrc !== proxiedImageUrl) {
                                setCoverImageSrc(proxiedImageUrl);
                            }
                        }}
                    />
                )}

                {/* Video Play Overlay */}
                {isVideo && canPlay && !isPlaying && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center flex md:hidden md:group-hover:flex transition-all duration-300">
                        <div className="bg-black/40 hover:bg-black/50 backdrop-blur-[2px] rounded-full p-4 shadow-xl border border-white/20 transform transition-transform group-hover:scale-110">
                            <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                    </div>
                )}

                {/* Type Badges */}
                <div className="absolute top-2 right-2 flex gap-1 z-20 items-center">
                    <Badge variant="secondary" className="text-[10px] bg-black/60 text-white border-none">
                        {platformLabel}
                    </Badge>
                    {isVideo && canPlay && (
                        <div className="bg-black/50 text-white p-1 rounded md:block hidden md:group-hover:hidden transition-opacity">
                            <Play className="w-3 h-3" />
                        </div>
                    )}
                    {isSidecar && <div className="bg-black/50 text-white p-1 rounded"><Layers className="w-3 h-3" /></div>}
                </div>
            </CardContent>

            {/* Footer Info */}
            <div className="p-2 sm:p-4 flex flex-col gap-2 sm:gap-3">
                {/* Stats Row */}
                <div className="flex items-center justify-between border-b border-border pb-2 sm:pb-3">
                    <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex items-center gap-1 sm:gap-1.5 text-foreground font-medium">
                            <Heart className="w-3 h-3 sm:w-4 sm:h-4 fill-red-500 text-red-500" />
                            <span>{formatNumber(post.like_count)}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{formatNumber(post.comment_count)}</span>
                        </div>
                        {(post.video_view_count || 0) > 0 && (
                            <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{formatNumber(post.video_view_count!)}</span>
                            </div>
                        )}
                    </div>

                    <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted"
                        title="View Original Post"
                    >
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    </a>
                </div>

                {/* Author & Time */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                        <a
                            href={profileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 font-bold font-mono transition-colors"
                        >
                            @{post.profiles?.username}
                        </a>
                        <span className="text-muted-foreground text-[10px] sm:text-xs flex items-center gap-1">
                            {formatDate(post.posted_at)}
                        </span>
                    </div>

                    {post.caption && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-sans opacity-70">
                            {post.caption}
                        </p>
                    )}
                    {previewTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {previewTags.map((tag) => (
                                <Badge key={tag.id} variant="outline" className="text-[10px] px-1.5 py-0">
                                    {tag.label}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
