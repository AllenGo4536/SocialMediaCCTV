
import { useEffect, useState } from 'react';
import Image from 'next/image';
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
    const coverFrameClassName = 'aspect-[3/2] min-h-[15rem] sm:min-h-[16rem] xl:min-h-[17rem]';

    return (
        <Card className="overflow-hidden h-full flex flex-col border border-border bg-card shadow-sm rounded-xl group transition-all hover:shadow-md">
            {/* Cover Image */}
            <CardContent
                className={`p-0 relative bg-muted ${coverFrameClassName} ${canPlay ? 'cursor-pointer' : 'cursor-default'}`}
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
                    <>
                        {/* Blurred Background Layer */}
                        <Image
                            src={coverImageSrc}
                            alt=""
                            fill
                            className="object-cover opacity-40 blur-xl scale-110 pointer-events-none"
                            referrerPolicy="no-referrer"
                        />
                        {/* Foreground Contained Image */}
                        <Image
                            src={coverImageSrc}
                            alt={post.caption || `${platformLabel} Post`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            priority={priority}
                            className="object-contain transition-opacity group-hover:opacity-90 relative z-0"
                            referrerPolicy="no-referrer"
                            onError={() => {
                                if (coverImageSrc !== proxiedImageUrl) {
                                    setCoverImageSrc(proxiedImageUrl);
                                }
                            }}
                        />
                    </>
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
            <div className="p-3 sm:p-4 flex flex-col gap-2.5 flex-grow">
                {/* Author, Time & Link (Top) */}
                <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <a
                            href={profileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-primary font-medium truncate shrink"
                        >
                            @{post.profiles?.username}
                        </a>
                        <span className="text-muted-foreground/50 text-[10px] shrink-0">•</span>
                        <span className="text-muted-foreground text-[11px] shrink-0">
                            {formatDate(post.posted_at)}
                        </span>
                    </div>
                    <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0 ml-2"
                        title="View Original Post"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>

                {/* Caption (Middle) */}
                {post.caption && (
                    <p className="text-[13px] leading-relaxed text-foreground/90 line-clamp-2 font-medium">
                        {post.caption}
                    </p>
                )}

                {/* Tags Buffer */}
                <div className="flex-grow min-h-2 mt-0.5">
                    {previewTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {previewTags.map((tag) => (
                                <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary/60 text-secondary-foreground/80 font-normal hover:bg-secondary/80">
                                    {tag.label}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stats Row (Bottom) */}
                <div className="flex items-center gap-3.5 pt-2.5 mt-1 border-t border-border/40 text-[11px] font-medium text-muted-foreground">
                    <div className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Heart className="w-3.5 h-3.5" />
                        <span>{formatNumber(post.like_count)}</span>
                    </div>
                    <div className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{formatNumber(post.comment_count)}</span>
                    </div>
                    {(post.video_view_count || 0) > 0 && (
                        <div className="flex items-center gap-1 hover:text-foreground transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{formatNumber(post.video_view_count!)}</span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
