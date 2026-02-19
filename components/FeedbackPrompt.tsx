
'use client';

import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackModal } from './FeedbackModal';

const STORAGE_KEY = 'budgetlynx_feedback_dismissed';
const DELAY_MS = 30000; // 30 seconds
const COOLDOWN_DAYS = 7;

export function FeedbackPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRating, setSelectedRating] = useState(0);

    useEffect(() => {
        // Check if dismissed recently
        const dismissedAt = localStorage.getItem(STORAGE_KEY);
        if (dismissedAt) {
            const daysSinceDismissal = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissal < COOLDOWN_DAYS) {
                return;
            }
        }

        // Show after delay
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, DELAY_MS);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    };

    const handleStarClick = (rating: number) => {
        setSelectedRating(rating);
        setIsModalOpen(true);
        setIsVisible(false);
        localStorage.setItem(STORAGE_KEY, Date.now().toString()); // Consider interaction as "dismissed" for prompt purposes
    };

    if (!isVisible && !isModalOpen) return null;

    return (
        <>
            {isVisible && (
                <div className="fixed bottom-4 right-4 z-40 w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="bg-background border border-border shadow-2xl rounded-xl p-4 relative">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <h3 className="font-semibold text-base mb-1">Enjoying BudgetLynx?</h3>
                        <p className="text-sm text-muted-foreground mb-3">Help us improve by rating your experience.</p>

                        <div className="flex justify-center gap-2 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => handleStarClick(star)}
                                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95 group"
                                >
                                    <Star className="w-8 h-8 fill-transparent text-muted-foreground group-hover:text-yellow-400 group-hover:fill-yellow-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <FeedbackModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialRating={selectedRating}
            />
        </>
    );
}
