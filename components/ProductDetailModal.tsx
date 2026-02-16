'use client';

import { Product } from '@/lib/types';
import { X, ExternalLink, TrendingDown, Star } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';

interface ProductDetailModalProps {
    product: Product;
    onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
    // Prevent scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!product) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-background rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

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
                                    {product.rating} <span className="text-muted-foreground">({product.reviews})</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg border border-border">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Unit Info</div>
                                <div className="font-medium">
                                    {product.unitInfo?.formatted}
                                </div>
                            </div>
                        </div>

                        {/* Mock Price History */}
                        <div className="flex-1 min-h-[100px] rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 border border-green-100 dark:border-green-900/50 flex flex-col justify-between group">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4" /> Price History
                                </span>
                                <span className="text-xs text-green-600/70 dark:text-green-400/70">Last 30 days</span>
                            </div>
                            <div className="mt-2 text-sm text-green-800 dark:text-green-300">
                                This is the lowest price in 30 days. Good time to buy!
                            </div>
                        </div>

                        {/* CTA */}
                        <a
                            href={product.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-auto"
                        >
                            View on {product.source} <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
