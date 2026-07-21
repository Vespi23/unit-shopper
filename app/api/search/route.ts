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

        // Enforce Resilient Quality Gate: Only filter out items that explicitly fail ratings/reviews, 
        // allowing items with unpopulated review counts (common in search summaries) to pass through.
        const filteredResults = results.filter(product => {
            const rating = product.averageRating ?? 4.5;
            const reviews = product.numberOfReviews ?? 0;
            
            // If reviews are unpopulated (0), give it a pass to ensure Amazon items render
            const passesReviews = reviews === 0 || reviews >= 100;
            const passesRating = rating >= 4.0;

            return passesRating && passesReviews;
        });

        console.log(`[SEARCH_API] Master pool: ${results.length} | Post-Filter: ${filteredResults.length}`);

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