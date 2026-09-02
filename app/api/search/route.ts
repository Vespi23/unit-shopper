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
        
        console.log(`[SEARCH_API] Master pool: ${results.length} | Post-Filter: ${results.length}`);

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
