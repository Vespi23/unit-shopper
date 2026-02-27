import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';
import { redis } from '@/lib/redis';

const RATE_LIMIT_WINDOW_SECONDS = 10;
const MAX_REQUESTS_PER_WINDOW = 10;

export const maxDuration = 60;

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

    const cacheKey = `search:v2:${query.toLowerCase()}:${page}`;

    // Try Cache
    if (redis.isOpen || process.env.REDIS_URL || process.env.KV_URL) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                console.log(`Cache HIT for: ${query}, page: ${page}`);
                // Ensure we return JSON object, redis stores string
                // Depending on how we store it. We should store as stringified JSON.
                // But redis.get returns string | null usually. 
                // Let's assume we store as string.
                // Wait, if vercel KV, it might return object if we used json.set? 
                // But standard redis is string. Let's parse.
                // Actually, let's keep it simple: store string, parse.
                return NextResponse.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
            }
        } catch (error) {
            console.error('Redis cache read error:', error);
        }
    }

    try {
        console.log(`Cache MISS. Searching for: ${query}, page: ${page} (IP: ${ip})`);
        const results = await searchProducts(query, page);

        // Store in Cache (Background)
        if (results && results.length > 0 && (redis.isOpen || process.env.REDIS_URL || process.env.KV_URL)) {
            // TTL: 24 hours (86400 seconds)
            // Dont await this to speed up response? Vercel serverless might kill it. 
            // Safer to await or use waitUntil if available (Next.js has after() in experimental/newer, but let's await for safety)
            try {
                await redis.setEx(cacheKey, 86400, JSON.stringify(results));
            } catch (err) {
                console.error("Redis cache write error", err);
            }
        }

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
