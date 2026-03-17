import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis connection
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

// Create a sliding window rate limiter: 15 requests per 1 minute per IP
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(15, '1 m'),
  analytics: true,
});

// UPGRADED for Next.js 16: Changed function name to 'proxy'
export async function proxy(request: NextRequest) {
  // Only apply this to our expensive search API
  if (request.nextUrl.pathname.startsWith('/api/search')) {
    
    // UPGRADED for Next.js 16: Safely extract IP from headers instead of request.ip
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    
    // Check the limit
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    // If they hit the limit, block the request instantly
    if (!success) {
      return NextResponse.json(
        { error: 'Too many search requests. Please wait a minute before trying again.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};