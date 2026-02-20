'use client';

import { Product } from '@/lib/types';
import { ExternalLink, ShoppingCart, Star } from 'lucide-react';
import Image from 'next/image';
import { getAffiliateLink } from '@/lib/affiliate';
import { generateProductSchema } from '@/lib/schema';

interface ProductCardProps {
    product: Product;
    onClick: (product: Product) => void;
    onSelect: (productId: string, selected: boolean) => void;
    isSelected: boolean;
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

import { useABTest } from '@/hooks/useABTest';

import { memo, useCallback } from 'react';

export const ProductCard = memo(function ProductCard({ product, onClick, onSelect, isSelected }: ProductCardProps) {
    const { variant, trackConversion, isReady } = useABTest('cta_color');

    const handleCardClick = useCallback(() => {
        onClick(product);
    }, [onClick, product]);

    const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onSelect(product.id, e.target.checked);
    }, [onSelect, product.id]);

    const handleViewDeal = (e: React.MouseEvent) => {
        e.stopPropagation(); // Link handles navigation, but we track first?
        // Actually for <a> tag, user navigates away. We track, but it might race.
        // Usually safer to use onClick.
        trackConversion('CTA Clicked', { productId: product.id, title: product.title });
    };

    // Experiment Styles
    const getCtaStyle = () => {
        const base = "mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all group-hover:shadow-lg";

        if (!isReady) return `${base} bg-primary/10 text-primary hover:bg-primary hover:text-white`; // Loading/Default

        if (variant === 'variant_b') {
            // Variant B: "Destructive" Red for Urgency
            return `${base} bg-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:shadow-red-900/20`;
        }

        // Control: Standard Primary Blue/Theme
        return `${base} bg-primary/10 text-primary hover:bg-primary hover:text-white group-hover:shadow-primary/20`;
    };

    const getCtaText = () => {
        if (variant === 'variant_b') return "Get it Now";
        return "View Deal";
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
                <Image
                    src={product.image}
                    alt={product.title}
                    width={300}
                    height={300}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                />

                {/* Unit Price Badge (Hero) */}
                <div className="absolute bottom-3 right-3 bg-emerald-600 text-white dark:bg-emerald-500 shadow-xl shadow-emerald-900/20 px-4 py-2 rounded-2xl text-sm font-extrabold backdrop-blur-md border border-emerald-400/30 z-10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-emerald-900/40 flex items-center gap-1.5">
                    <span className="drop-shadow-md">{product.pricePerUnit}</span>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col p-5 bg-gradient-to-b from-transparent to-muted/20">
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
                    {getCtaText()} <ExternalLink className="h-4 w-4" />
                </a>
            </div>

            {/* Structured Data (JSON-LD) */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateProductSchema(product)) }}
            />
        </div>
    );
});
