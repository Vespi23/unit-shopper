import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';

export const maxDuration = 60;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        console.log(`Searching for: ${query}, page: ${page} (IP: ${ip})`);
        
        // Direct fetch from Decodo
        const results = await searchProducts(query, page);

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