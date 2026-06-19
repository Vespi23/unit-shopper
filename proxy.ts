import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const url = process.env.UPSTASH_REDIS_REST_URL || "";
const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";

// Config settings matching your sliding window layout
const LIMIT = 15;
const WINDOW_SECONDS = 60;

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/search')) {
    
    // Extract user tracking footprint safely across Next.js 16 container specs
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    
    // Explicit sliding window execution timestamp keys
    const cacheKey = `bl_rate:${ip}`;
    const now = Math.floor(Date.now() / 1000);
    const clearWindowBoundary = now - WINDOW_SECONDS;

    if (url && token) {
      try {
        // Atomic pipeline tracking loop sent natively via standard JSON arrays
        const evaluationPayload = [
          ["ZREMRANGEBYSCORE", cacheKey, "-inf", clearWindowBoundary.toString()],
          ["ZCARD", cacheKey],
          ["ZADD", cacheKey, now.toString(), `${now}-${Math.random()}`],
          ["EXPIRE", cacheKey, WINDOW_SECONDS.toString()]
        ];

        const res = await fetch(`${url}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(evaluationPayload),
        });

        if (res.ok) {
          const rawResponseMatrix = await res.json();
          // Extract card index evaluation from array step 2 
          const currentRequestCount = parseInt(rawResponseMatrix.result?.[1] || "0", 10);

          if (currentRequestCount >= LIMIT) {
            return NextResponse.json(
              { error: 'Too many search requests. Please wait a minute before trying again.' },
              {
                status: 429,
                headers: {
                  'X-RateLimit-Limit': LIMIT.toString(),
                  'X-RateLimit-Remaining': '0',
                  'X-RateLimit-Reset': (now + WINDOW_SECONDS).toString(),
                },
              }
            );
          }
          
          // Inject metrics headers dynamically into downstream client frames
          const response = NextResponse.next();
          response.headers.set('X-RateLimit-Limit', LIMIT.toString());
          response.headers.set('X-RateLimit-Remaining', Math.max(0, LIMIT - currentRequestCount - 1).toString());
          return response;
        }
      } catch (_) {
        // Safe fallback: Allow execution loop to proceed if database node times out
        return NextResponse.next();
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};