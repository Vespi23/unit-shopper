'use client';

import { Product } from '@/lib/types';
import { X, ExternalLink, TrendingDown, Star, Share2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';
import { getAffiliateLink } from '@/lib/affiliate';
import { generateProductSchema } from '@/lib/schema';
import { PriceHistoryChart } from './PriceHistoryChart';
import { useToast } from "@/components/ui/use-toast";

interface ProductDetailModalProps {
    product: Product;
    onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
    const { toast } = useToast();
    
    // Prevent scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!product) return null;

    const handleShareSavings = async () => {
        const trackingUrl = `${window.location.origin}/?q=${encodeURIComponent(product.title)}&ref=sharesavings`;
        const shareSnippet = `🎯 Deal Alert via BudgetLynx.com!\n📦 Product: ${product.title}\n💎 Unit Price: ${product.pricePerUnit} (${product.unitInfo?.formatted || 'N/A'})\n💵 Total Cost: $${product.price.toFixed(2)}\n\nCheck the unit value calculation here:\n👇👇👇\n${trackingUrl}`;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareSnippet);
            } else {
                // FORCE-THROUGH FALLBACK LOOP FOR SANDBOXED APPS/HTTP ENVIRONMENT COMPLIANCE
                const element = document.createElement('textarea');
                element.value = shareSnippet;
                element.style.position = 'fixed';
                element.style.opacity = '0';
                element.style.left = '-9999px';
                document.body.appendChild(element);
                element.select();
                element.setSelectionRange(0, 99999);
                document.execCommand('copy');
                document.body.removeChild(element);
            }

            toast({
                title: "Savings Copied! 🔥",
                description: "Viral text snippet copied to your clipboard. Ready to paste!",
            });
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Copy Execution Failed",
                description: "Your platform or browser blocked auto-copy access.",
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-background rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
                {/* Action Buttons */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                    <button
                        onClick={handleShareSavings}
                        className="p-2 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors group"
                        title="Share Savings Text"
                        type="button"
                    >
                        <Share2 className="w-6 h-6 group-active:scale-95" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                        type="button"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 h-full max-h-[90vh] overflow-y-auto">
                    {/* Image Section */}
                    <div className="bg-white p-8 flex items-center justify-center min-h-[300px] md:h-full">
                        <div className="relative w-full h-full max-h-[400px] aspect-square">
                            <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                className="object-contain mix-blend-multiply"
                            />
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="p-8 flex flex-col gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                                {product.source}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                                {product.title}
                            </h2>
                        </div>

                        {/* Price Block */}
                        <div className="flex items-end gap-4 p-4 rounded-xl bg-muted/50">
                            <div>
                                <div className="text-sm text-muted-foreground font-medium mb-1">Unit Price</div>
                                <div className="text-4xl font-extrabold text-primary tracking-tight">
                                    {product.pricePerUnit}
                                </div>
                            </div>
                            <div className="h-12 w-px bg-border mx-2"></div>
                            <div>
                                <div className="text-sm text-muted-foreground font-medium mb-1">Total Price</div>
                                <div className="text-2xl font-bold">
                                    ${product.price.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Specs */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg border border-border">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Rating</div>
                                <div className="flex items-center gap-1 font-medium">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    {product.averageRating} <span className="text-muted-foreground">({product.numberOfReviews})</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg border border-border">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Unit Info</div>
                                <div className="font-medium">
                                    {product.unitInfo?.formatted}
                                </div>
                            </div>
                        </div>

                        {/* Price History Chart */}
                        <PriceHistoryChart product={product} />

                        {/* Split Action Footers for Virality Optimization */}
                        <div className="mt-auto flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleShareSavings}
                                className="w-full sm:w-1/3 py-4 bg-muted hover:bg-muted/80 font-bold text-lg rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-98"
                                type="button"
                            >
                                Share Math 🔥
                            </button>
                            <a
                                href={getAffiliateLink(product)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-2/3 py-4 bg-primary text-primary-foreground font-bold text-lg rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                View Deal on Amazon <ExternalLink className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Structured Data (JSON-LD) */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateProductSchema(product)) }}
            />
        </div>
    );
}