
import { NextRequest, NextResponse } from 'next/server';

const BROWSER_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function isTikTokRelatedHost(hostname: string) {
    const host = hostname.toLowerCase();
    return (
        host.includes('tiktok') ||
        host.includes('byteoversea') ||
        host.includes('ibyteimg') ||
        host.includes('muscdn') ||
        host.includes('snssdk')
    );
}

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const urlObj = new URL(url);

        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
        }

        const upstreamHeaders = new Headers({
            'User-Agent': BROWSER_USER_AGENT,
            Accept: '*/*',
        });

        const range = req.headers.get('range');
        if (range) {
            upstreamHeaders.set('Range', range);
        }

        // TikTok CDN often requires browser-like referer/origin.
        if (isTikTokRelatedHost(urlObj.hostname)) {
            upstreamHeaders.set('Referer', 'https://www.tiktok.com/');
            upstreamHeaders.set('Origin', 'https://www.tiktok.com');
        }

        const response = await fetch(url, {
            headers: upstreamHeaders,
            redirect: 'follow',
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch video: ${response.status}` }, { status: response.status });
        }

        const headers = new Headers();
        const passthroughHeaders = [
            'content-type',
            'content-length',
            'accept-ranges',
            'content-range',
            'etag',
            'last-modified',
        ];
        passthroughHeaders.forEach((headerName) => {
            const value = response.headers.get(headerName);
            if (value) headers.set(headerName, value);
        });
        if (!headers.get('content-type')) {
            headers.set('content-type', 'video/mp4');
        }

        headers.set('Cache-Control', 'public, max-age=3600');
        headers.set('Access-Control-Allow-Origin', '*');

        return new NextResponse(response.body, {
            status: response.status,
            headers,
        });

    } catch (error: unknown) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy video' }, { status: 500 });
    }
}
