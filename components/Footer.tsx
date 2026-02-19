'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FeedbackModal } from './FeedbackModal';

export function Footer() {
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    return (
        <>
            <footer className="w-full border-t border-border bg-background py-8 text-center text-sm text-muted-foreground">
                <div className="container mx-auto px-4">
                    <p className="mb-4">
                        &copy; {new Date().getFullYear()} FinFlow LLC. All rights reserved.
                    </p>
                    <div className="max-w-2xl mx-auto space-y-2 text-xs opacity-70">
                        <p>
                            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
                            {' • '}
                            <Link href="/terms" className="hover:underline">Terms of Service</Link>
                            {' • '}
                            <Link href="/contact" className="hover:underline">Contact</Link>
                            {' • '}
                            <button onClick={() => setIsFeedbackOpen(true)} className="hover:underline">
                                Feedback
                            </button>
                        </p>
                        <p>
                            BudgetLynx is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com.
                        </p>
                        <p>
                            We also participate in other affiliate programs (including Walmart) and may earn a commission from qualifying purchases made through our links, at no extra cost to you.
                        </p>
                    </div>
                </div>
            </footer>
            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </>
    );
}
