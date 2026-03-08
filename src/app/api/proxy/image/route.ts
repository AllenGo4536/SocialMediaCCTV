
import { NextRequest, NextResponse } from 'next/server';

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

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch image: ${response.status}` }, { status: response.status });
        }

        const headers = new Headers();
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const etag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');

        headers.set('Content-Type', contentType || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Access-Control-Allow-Origin', '*');
        if (contentLength) headers.set('Content-Length', contentLength);
        if (etag) headers.set('ETag', etag);
        if (lastModified) headers.set('Last-Modified', lastModified);

        return new NextResponse(response.body, {
            status: response.status,
            headers,
        });

    } catch (error: unknown) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
    }
}
