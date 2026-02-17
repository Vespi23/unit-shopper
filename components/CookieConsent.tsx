
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import Link from 'next/link';
import { X } from 'lucide-react';

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            // Small delay for better UX
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const accept = () => {
        localStorage.setItem('cookie-consent', 'true');
        setIsVisible(false);
    };

    const decline = () => {
        localStorage.setItem('cookie-consent', 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t shadow-lg animate-in slide-in-from-bottom duration-500">
            <div className="container max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <div className="flex-1">
                    <p>
                        We use cookies to improve your experience and support our free service via affiliate links. By using our site, you agree to our <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link> and <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={decline} variant="outline" size="sm">
                        Necessary Only
                    </Button>
                    <Button onClick={accept} size="sm">
                        Accept All
                    </Button>
                    <button onClick={decline} className="md:hidden text-muted-foreground" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
