import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

// Define the feedback data structure for type safety
type FeedbackData = {
    name: string;
    email?: string;
    type: 'bug' | 'feature' | 'general';
    message: string;
    rating?: number;
    timestamp: string;
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, type, message, rating } = body;

        const newFeedback: FeedbackData = {
            name: name.slice(0, 100),
            email: (email || '').slice(0, 100),
            type,
            message: message.slice(0, 2000),
            rating,
            timestamp: new Date().toISOString(),
        };

        // Fallback if Redis is not configured
        if (!process.env.REDIS_URL && !process.env.KV_URL) {
            console.log('FEEDBACK RECEIVED (Redis not configured):', JSON.stringify(newFeedback, null, 2));
            return NextResponse.json({ success: true, message: 'Feedback received (logged to console)!' });
        }

        // Get IP for rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitKey = `ratelimit:feedback:${ip}`;

        // Check rate limit using Redis
        // Note: If Redis is connecting, this will queue. If connection fails, it will error out.
        // We catch errors below, so it's safe.
        const currentRequests = await redis.incr(rateLimitKey);

        // Set expiry for the key if it's the first request
        if (currentRequests === 1) {
            await redis.expire(rateLimitKey, 60);
        }

        if (currentRequests > MAX_REQUESTS_PER_WINDOW) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        // Basic validation
        if (!name || !message || !type) {
            return NextResponse.json(
                { error: 'Name, type, and message are required.' },
                { status: 400 }
            );
        }

        // Input Sanitization & Validation
        if (message.length > 2000) {
            return NextResponse.json(
                { error: 'Message is too long (max 2000 characters).' },
                { status: 400 }
            );
        }

        if (name.length > 100) {
            return NextResponse.json(
                { error: 'Name is too long (max 100 characters).' },
                { status: 400 }
            );
        }

        // Store feedback in a Redis list
        // "feedback:list" will store all feedback entries
        await redis.lPush('feedback:list', JSON.stringify(newFeedback));

        return NextResponse.json({ success: true, message: 'Feedback received!' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
