import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // Since Redis is removed, we log the feedback to the Vercel console.
        // You can view these in the Vercel Dashboard -> Logs.
        console.log('New Feedback Received:', body);

        return NextResponse.json({ 
            success: true, 
            message: 'Feedback submitted successfully' 
        });
    } catch (error) {
        console.error('Feedback parsing error:', error);
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
    }
}