// app/api/ping/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    // Extract metadata from the script ping
    const version = searchParams.get('v') || 'unknown';
    const type = searchParams.get('type') || 'heartbeat';
    const timestamp = new Date().toISOString();

    // LOG-BASED ANALYTICS: High-performance, zero-cost tracking
    console.log(`[ANALYTICS_PING] | Type: ${type} | Ver: ${version} | Time: ${timestamp}`);

    // Return a 1x1 transparent tracking pixel (GIF)
    const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
    );

    return new NextResponse(pixel, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}