
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        // Validate URL host to prevent open proxy abuse (optional but recommended)
        // For now, let's allow instagram/fb/cdn domains.
        const urlObj = new URL(url);
        const allowedHosts = ['cdninstagram.com', 'fbcdn.net', 'instagram.com'];
        const isAllowed = allowedHosts.some(host => urlObj.hostname.endsWith(host));

        // Relaxed check for internal tool: just check proper protocol
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                // Pretend to be a browser to avoid some bot blocks, though IG CDN usually doesn't care if referer is empty
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch image: ${response.status}` }, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        // Return image with permissive headers
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable', // Cache aggressively
                'Access-Control-Allow-Origin': '*',
                // Explicitly do NOT forward CORP headers
            }
        });

    } catch (error: any) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
    }
}
