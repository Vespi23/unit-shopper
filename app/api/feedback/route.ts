
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the feedback data structure
type FeedbackData = {
    name: string;
    email?: string;
    type: 'bug' | 'feature' | 'general';
    message: string;
    timestamp: string;
};

// Path to the feedback file
const FEEDBACK_FILE_PATH = path.join(process.cwd(), 'data', 'feedback.json');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, type, message } = body;

        // Basic validation
        if (!name || !message || !type) {
            return NextResponse.json(
                { error: 'Name, type, and message are required.' },
                { status: 400 }
            );
        }

        const newFeedback: FeedbackData = {
            name,
            email: email || '',
            type,
            message,
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
