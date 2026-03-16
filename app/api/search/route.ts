import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';

// Force Next.js to always execute this route live and never cache it statically
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        console.log(`Searching for: ${query} (IP: ${ip})`);
        
        // Direct fetch from Decodo (Now fetches up to 7 pages concurrently)
        const results = await searchProducts(query);

        return NextResponse.json(results, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}