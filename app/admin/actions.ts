'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { redis } from '@/lib/redis';
import { randomUUID } from 'crypto';

const LOGIN_RATE_LIMIT_WINDOW = 60; // 1 minute
const MAX_LOGIN_ATTEMPTS = 5;
const SESSION_TTL = 86400; // 24 hours

export async function login(formData: FormData) {
    // 1. Rate Limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `ratelimit:login:${ip}`;

    try {
        if (redis.isOpen || process.env.REDIS_URL) {
            const attempts = await redis.incr(rateLimitKey);
            if (attempts === 1) {
                await redis.expire(rateLimitKey, LOGIN_RATE_LIMIT_WINDOW);
            }
            if (attempts > MAX_LOGIN_ATTEMPTS) {
                redirect('/admin?error=ratelimited');
            }
        }
    } catch (error) {
        // If Redis fails, we log but might still allow login to proceed 
        // depending on strictness preference. 
        // For security, strictly speaking, we should fail open or closed?
        // Given this is an admin panel, failing open (allowing retry) is risky but user-friendly if Redis blips.
        // We'll proceed but log error.
        console.error('Redis rate limit error:', error);
    }

    // 2. Validate Credentials
    const emailRaw = formData.get('email');
    const passwordRaw = formData.get('password');

    const email = typeof emailRaw === 'string' ? emailRaw.trim() : '';
    const password = typeof passwordRaw === 'string' ? passwordRaw.trim() : '';

    const adminEmail = process.env.ADMIN_USERNAME?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
        // 3. Create Session
        const sessionId = randomUUID();
        const cookieStore = await cookies();

        try {
            if (redis.isOpen || process.env.REDIS_URL) {
                await redis.setEx(`session:${sessionId}`, SESSION_TTL, 'valid');
            }
        } catch (error) {
            console.error('Failed to store session in Redis:', error);
            redirect('/admin?error=server_error');
        }

        cookieStore.set('admin-session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: SESSION_TTL,
            path: '/',
            sameSite: 'strict'
        });

        redirect('/admin');
    } else {
        redirect('/admin?error=invalid');
    }
}

export async function logout() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('admin-session')?.value;

    if (sessionId) {
        try {
            if (redis.isOpen || process.env.REDIS_URL) {
                await redis.del(`session:${sessionId}`);
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
        }
    }

    cookieStore.delete('admin-session');
    redirect('/admin');
}
