
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the feedback data structure
type FeedbackData = {
    name: string;
    email?: string;
    type: 'bug' | 'feature' | 'general';
    message: string;
    rating?: number;
    timestamp: string;
};

// Path to the feedback file
const FEEDBACK_FILE_PATH = path.join(process.cwd(), 'data', 'feedback.json');

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3;
const ipRequestMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const requestTimestamps = ipRequestMap.get(ip) || [];

    // Filter out old timestamps
    const recentRequests = requestTimestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }

    recentRequests.push(now);
    ipRequestMap.set(ip, recentRequests);
    return false;
}

export async function POST(request: Request) {
    try {
        // Get IP for rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { name, email, type, message, rating } = body;

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

        const newFeedback: FeedbackData = {
            name: name.slice(0, 100), // Enforce limit
            email: (email || '').slice(0, 100),
            type,
            message: message.slice(0, 2000), // Enforce limit, simple sanitization could be added here if needed
            rating,
            timestamp: new Date().toISOString(),
        };

        // Ensure directory exists
        const dataDir = path.dirname(FEEDBACK_FILE_PATH);
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }

        // Read existing file or start empty
        let feedbackList: FeedbackData[] = [];
        try {
            const fileContent = await fs.readFile(FEEDBACK_FILE_PATH, 'utf-8');
            feedbackList = JSON.parse(fileContent);
        } catch (error: any) {
            // If file doesn't exist, capable of starting fresh. 
            // Other errors might need logging, but for now treat as empty.
        }

        // Append new feedback
        feedbackList.push(newFeedback);

        // Write back to file
        await fs.writeFile(FEEDBACK_FILE_PATH, JSON.stringify(feedbackList, null, 2), 'utf-8');

        return NextResponse.json({ success: true, message: 'Feedback received!' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
