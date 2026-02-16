import { NextResponse } from 'next/server';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { searchProducts } from '@/lib/api-client';
import { Product } from '@/lib/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        let results: Product[] = [];

        // Use Real API if key is present
        if (process.env.SERPAPI_KEY) {
            console.log(`Fetching real data for: ${query}`);
            results = await searchProducts(query);
        } else {
            console.log(`Using mock data for: ${query}`);
            // Filter mock data
            const lowerQuery = query.toLowerCase();
            const mockData = MOCK_PRODUCTS as unknown as Product[]; // Cast because mock data omits some fields
            results = mockData.filter((p: Product) =>
                p.title.toLowerCase().includes(lowerQuery) ||
                p.source.toLowerCase().includes(lowerQuery)
            );
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
