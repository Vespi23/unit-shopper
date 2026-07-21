import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
        return NextResponse.json([], { 
            status: 200,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    try {
        const results = await searchProducts(query);

        // Enforce Strict Quality Gate: 4+ stars and 100+ reviews
        const filteredResults = results.filter(product => {
            const rating = product.averageRating ?? 0;
            const reviews = product.numberOfReviews ?? 0;
            return rating >= 4.0 && reviews >= 100;
        });

        return NextResponse.json(filteredResults, {
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