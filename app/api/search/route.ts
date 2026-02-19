import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';
import { redis } from '@/lib/redis';

const RATE_LIMIT_WINDOW_SECONDS = 10;
const MAX_REQUESTS_PER_WINDOW = 10;

export async function GET(request: Request) {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    // Only perform Redis rate limiting if Redis is available
    // If not available, we skip rate limiting to avoid blocking legitimate users (fail open)
    // or we could use a fallback in-memory map if strictness is required.
    // For now, fail open is safer for availability.
    if (redis.isOpen || process.env.REDIS_URL || process.env.KV_URL) {
        try {
            const rateLimitKey = `ratelimit:search:${ip}`;
            const currentRequests = await redis.incr(rateLimitKey);

            if (currentRequests === 1) {
                await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
            }

            if (currentRequests > MAX_REQUESTS_PER_WINDOW) {
                return NextResponse.json(
                    { error: 'Too many requests. Please try again later.' },
                    { status: 429 }
                );
            }
        } catch (error) {
            console.error('Rate limit error:', error);
            // Continue if Redis fails
        }
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        console.log(`Searching for: ${query}, page: ${page} (IP: ${ip})`);
        const results = await searchProducts(query, page);
        return NextResponse.json(results);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
