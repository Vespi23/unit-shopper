'use client';

import { Product } from '@/lib/types';
import { X, ExternalLink, Star } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';
import { getAffiliateLink } from '@/lib/affiliate';

interface ComparisonViewProps {
    products: Product[];
    onClose: () => void;
}

export function ComparisonView({ products, onClose }: ComparisonViewProps) {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    // Helper to find best value (lowest Score)
    const bestValueId = products.reduce((prev, curr) =>
        (curr.score || 999999) < (prev.score || 999999) ? curr : prev
    ).id;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-200">
            <div className="relative w-full h-full max-w-7xl bg-background rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <div>
                        <h2 className="text-2xl font-bold">Comparison</h2>
                        <p className="text-muted-foreground text-sm"> comparing {products.length} products</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Comparison Grid */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-[120px_repeat(auto-fit,minmax(200px,1fr))] md:grid-cols-[150px_repeat(auto-fit,minmax(250px,1fr))] gap-0 border border-border rounded-xl overflow-hidden divide-x divide-border min-w-max">

                        {/* Labels Column */}
                        <div className="bg-muted/50 divide-y divide-border font-medium text-sm text-muted-foreground child:p-4 child:h-20 child:flex child:items-center sticky left-0 z-20 shadow-[5px_0_10px_-5px_rgba(0,0,0,0.1)]">
                            <div className="h-[200px]! items-start pt-4">Product</div>
                            <div>Price</div>
                            <div className="bg-primary/5 text-primary font-bold">Unit Price</div>
                            <div>Unit Size</div>
                            <div>Rating</div>
                            <div>Source</div>
                            <div>Action</div>
                        </div>

                        {/* Product Columns */}
                        {products.map(product => {
                            const isBestValue = product.id === bestValueId;

                            return (
                                <div key={product.id} className="divide-y divide-border relative">
                                    {isBestValue && (
                                        <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-bold text-center py-1 z-10">
                                            BEST VALUE
                                        </div>
                                    )}

                                    {/* Image & Title */}
                                    <div className="h-[200px] p-4 flex flex-col items-center text-center gap-2 pt-8">
                                        <div className="relative w-24 h-24">
                                            <Image
                                                src={product.image}
                                                alt={product.title}
                                                fill
                                                className="object-contain mix-blend-multiply dark:mix-blend-normal"
                                            />
                                        </div>
                                        <div className="text-sm font-medium line-clamp-3 leading-tight" title={product.title}>
                                            {product.title}
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="h-20 p-4 flex items-center justify-center font-bold text-lg">
                                        ${product.price.toFixed(2)}
                                    </div>

                                    {/* Unit Price */}
                                    <div className={`h-20 p-4 flex items-center justify-center font-extrabold text-xl ${isBestValue ? 'text-green-600 bg-green-50 dark:bg-green-900/10' : 'text-primary'}`}>
                                        {product.pricePerUnit}
                                    </div>

                                    {/* Unit Info */}
                                    <div className="h-20 p-4 flex items-center justify-center text-sm text-muted-foreground">
                                        {product.unitInfo?.formatted}
                                    </div>

                                    {/* Rating */}
                                    <div className="h-20 p-4 flex items-center justify-center gap-1">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        <span>{product.rating}</span>
                                        <span className="text-xs text-muted-foreground">({product.reviews})</span>
                                    </div>

                                    {/* Source */}
                                    <div className="h-20 p-4 flex items-center justify-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${(() => {
                                                const sourceMap: Record<string, string> = {
                                                    'amazon': 'bg-orange-500',
                                                    'walmart': 'bg-blue-600',
                                                    'target': 'bg-red-600'
                                                };
                                                const sourceKey = product.source?.toLowerCase() || 'other';
                                                return sourceMap[sourceKey] || 'bg-gray-600';
                                            })()
                                            }`}>
                                            {product.source || 'Unknown'}
                                        </span>
                                    </div>

                                    {/* CTA */}
                                    <div className="h-20 p-4 flex items-center justify-center">
                                        <a
                                            href={getAffiliateLink(product)}
                                            target="_blank"
                                            rel="nofollow noopener noreferrer"
                                            className="p-2 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
