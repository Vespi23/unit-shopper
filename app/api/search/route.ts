import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; 

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    // UPGRADE: Safely handle multi-hop IPs
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        console.log(`[EXECUTION START] Query: ${query} (IP: ${ip})`);
        
        // heavy lifting moved to lib/api-client.ts to stay within 54s safety window
        const results = await searchProducts(query);

        // FORCE-THROUGH WORKAROUND: Truncate to top 100 to prevent serialization timeout
        const finalResults = results.slice(0, 100);

        return NextResponse.json(finalResults, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Result-Count': finalResults.length.toString()
            }
        });
    } catch (error) {
        console.error('[FATAL SEARCH ERROR]:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' }, 
            { status: 500 }
        );
    }
}