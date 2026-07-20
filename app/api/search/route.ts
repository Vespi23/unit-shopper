import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * API route to aggregate search results from Amazon and Walmart.
 * Delegated to searchProducts() for batching and rate-limiting.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Guard against empty queries
    if (!query.trim()) {
        return NextResponse.json([], { 
            status: 200,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    try {
        // searchProducts handles the internal batch limits and per-request timeouts
        const results = await searchProducts(query);

        return NextResponse.json(results, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error) {
        console.error('[SEARCH_API_ERROR]:', error);
        return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
    }
}