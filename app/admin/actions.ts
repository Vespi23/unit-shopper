'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_TTL = 86400; // 24 hours

export async function login(formData: FormData) {
    // 1. Validate Credentials
    const emailRaw = formData.get('email');
    const passwordRaw = formData.get('password');

    const email = typeof emailRaw === 'string' ? emailRaw.trim() : '';
    const password = typeof passwordRaw === 'string' ? passwordRaw.trim() : '';

    const adminEmail = process.env.ADMIN_USERNAME?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
        // 2. Create Stateless Session
        const cookieStore = await cookies();

        cookieStore.set('admin-session', 'authenticated', {
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
    cookieStore.delete('admin-session');
    redirect('/admin');
}