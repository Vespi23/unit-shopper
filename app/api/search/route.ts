import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';

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
        
        // Fetch up to 7 pages concurrently
        const results = await searchProducts(query);

        // FORCE-THROUGH FILTER: 
        // 1. Remove items below rating 4.0 (Performance/Quality optimization)
        // 2. Remove items under 100 reviews (Social Proof / Outlier removal)
        // 3. Defensive sanitization to prevent server crashes on null nodes
        const filteredResults = results.filter((product: any) => {
            const rating = parseFloat(product.rating) || 0;
            
            // Shield: Safely coerce to string, strip commas, convert to base-10 integer
            const rawReviews = String(product.reviews || '0').replace(/,/g, '');
            const reviewCount = parseInt(rawReviews, 10) || 0;

            return rating >= 4.0 && reviewCount >= 100;
        });

        return NextResponse.json(filteredResults, {
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