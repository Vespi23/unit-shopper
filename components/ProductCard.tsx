'use client';

import { memo, useCallback } from 'react';
import { Product } from '@/lib/types';
import { ExternalLink, Star, Sparkles } from 'lucide-react';
import { getAffiliateLink } from '@/lib/affiliate';
import { useABTest } from '@/hooks/useABTest';

interface ProductCardProps {
    product: Product;
    onClick: (product: Product) => void;
    onSelect: (productId: string, selected: boolean) => void;
    isSelected: boolean;
    index?: number; // Added index to determine image priority
}

export function ProductCardSkeleton() {
    return (
        <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm h-full overflow-hidden">
            <div className="aspect-square w-full bg-muted animate-pulse" />
            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                <div className="mt-auto flex items-end justify-between pt-4">
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-6 w-12 bg-muted animate-pulse rounded" />
                </div>
            </div>
        </div>
    );
}

export const ProductCard = memo(function ProductCard({ product, onClick, onSelect, isSelected, index = 99 }: ProductCardProps) {
    const { variant, trackConversion, isReady } = useABTest('cta_color');

    // The first 4 items are visible above the fold on most devices. 
    // They get highest fetch priority to maximize Core Web Vitals (LCP).
    const isPriority = index < 4;

    const handleCardClick = useCallback(() => {
        onClick(product);
    }, [onClick, product]);

    const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onSelect(product.id, e.target.checked);
    }, [onSelect, product.id]);

    const handleViewDeal = (e: React.MouseEvent) => {
        e.stopPropagation();
        trackConversion('CTA Clicked', { productId: product.id, title: product.title });
    };

    const getCtaStyle = () => {
        const base = "mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all group-hover:shadow-lg";
        if (!isReady) return `${base} bg-primary/10 text-primary hover:bg-primary hover:text-white`;
        if (variant === 'variant_b') {
            return `${base} bg-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:shadow-red-900/20`;
        }
        return `${base} bg-primary/10 text-primary hover:bg-primary hover:text-white group-hover:shadow-primary/20`;
    };

    return (
        <div
            className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border/50 hover:border-primary/30'}`}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick();
                }
            }}
            aria-label={product.title}
        >
            {/* Selection Checkbox */}
            <div className="absolute top-1 left-1 z-20 p-2" onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-transform hover:scale-110 shadow-sm"
                    aria-label={`Select ${product.title} for comparison`}
                />
            </div>

            {/* Image Section */}
            <div className="relative aspect-square w-full overflow-hidden bg-white p-6">
                <img
                    src={product.image}
                    alt={product.title}
                    loading={isPriority ? "eager" : "lazy"}
                    fetchPriority={isPriority ? "high" : "auto"}
                    decoding="async"
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                />

                {/* Unit Price Badge (Hero) */}
                <div className="absolute bottom-3 right-3 bg-emerald-600 text-white dark:bg-emerald-500 shadow-xl shadow-emerald-900/20 px-4 py-2 rounded-2xl text-sm font-extrabold backdrop-blur-md border border-emerald-400/30 z-10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-emerald-900/40 flex items-center gap-1.5">
                    <span className="drop-shadow-md">{product.pricePerUnit}</span>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col p-5 bg-gradient-to-b from-transparent to-muted/20">
                {/* AI Verified Badge */}
                {product.aiVerified && (
                    <div className="mb-3 flex items-center gap-1.5 w-fit rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-400/20">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        AI Verified math
                    </div>
                )}
                
                <div className="mb-2 flex items-center gap-1 text-xs text-amber-500 font-medium">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{product.rating}</span>
                    <span className="text-muted-foreground font-normal">({product.reviews})</span>
                </div>

                <h3 className="line-clamp-2 text-sm font-semibold leading-tight min-h-[2.5rem] tracking-tight text-pretty" title={product.title}>
                    {product.title}
                </h3>

                <div className="mt-4 flex items-end justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Total
                        </span>
                        <span className="text-lg font-bold text-foreground">
                            ${product.price.toFixed(2)}
                        </span>
                    </div>

                    <div className="text-right">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {product.unitInfo?.formatted || 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Action Button */}
                <a
                    href={getAffiliateLink(product)}
                    onClick={handleViewDeal}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className={getCtaStyle()}
                >
                    View Deals <ExternalLink className="h-4 w-4" />
                </a>
            </div>
        </div>
    );
});