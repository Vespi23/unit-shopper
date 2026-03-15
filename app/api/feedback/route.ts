import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
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