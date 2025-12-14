
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const urlObj = new URL(url);
        // Allow same hosts as images plus potentially others if needed
        const allowedHosts = ['cdninstagram.com', 'fbcdn.net', 'instagram.com'];
        const isAllowed = allowedHosts.some(host => urlObj.hostname.endsWith(host));

        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
        }

        // Fetch the video
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch video: ${response.status}` }, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'video/mp4';
        const contentLength = response.headers.get('content-length');

        // Forward ranges if requested (basic support)
        // For a full streaming proxy we might need more complex range handling, 
        // but often just returning the body as a stream works for modern browsers using range requests against this proxy.
        // However, standard fetch response body in Node/Edge can simply be passed to NextResponse.

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Access-Control-Allow-Origin', '*');
        if (contentLength) {
            headers.set('Content-Length', contentLength);
        }

        return new NextResponse(response.body, {
            status: 200,
            headers: headers
        });

    } catch (error: any) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy video' }, { status: 500 });
    }
}
