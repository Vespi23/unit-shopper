'use client';

import { memo, useCallback } from 'react';
import { Product } from '@/lib/types';
import { ExternalLink, Star, Sparkles, Share2 } from 'lucide-react';
import { getAffiliateLink } from '@/lib/affiliate';
import { useABTest } from '@/hooks/useABTest';
import { useToast } from "@/components/ui/use-toast";

interface ProductCardProps {
    product: Product;
    onClick: (product: Product) => void;
    onSelect: (productId: string, selected: boolean) => void;
    isSelected: boolean;
    index?: number;
}

export function ProductCardSkeleton() {
    return (
        <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm h-full overflow-hidden">
            <div className="aspect-square w-full bg-muted animate-pulse" />
            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
            </div>
        </div>
    );
}

export const ProductCard = memo(function ProductCard({ product, onClick, onSelect, isSelected, index = 99 }: ProductCardProps) {
    const { variant, trackConversion, isReady } = useABTest('cta_color');
    const { toast } = useToast();

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

    const handleShareSavings = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const trackingUrl = `${window.location.origin}/?q=${encodeURIComponent(product.title)}&ref=sharesavings`;
        const shareSnippet = `🎯 Deal Alert via BudgetLynx.com!\n📦 Product: ${product.title}\n💎 Unit Price: ${product.ppuFormatted || product.pricePerUnit || 'N/A'}\n💵 Total Cost: $${product.price.toFixed(2)}\n\nCheck the unit value calculation here:\n👇👇👇\n${trackingUrl}`;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareSnippet);
            } else {
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

    const getCtaStyle = () => {
        const base = "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all group-hover:shadow-lg";
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
            <div className="absolute top-1 left-1 z-20 p-2" onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-transform hover:scale-110 shadow-sm"
                    aria-label={`Select ${product.title} for comparison`}
                />
            </div>

            <div className="relative aspect-square w-full overflow-hidden bg-white p-6">
                <img
                    src={product.image}
                    alt={product.title}
                    loading={isPriority ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                />

                {/* FIXED: Formats price badges to show accurate currency symbols and rounded values */}
                <div className="absolute bottom-3 right-3 bg-emerald-600 text-white dark:bg-emerald-500 shadow-xl shadow-emerald-900/20 px-4 py-2 rounded-2xl text-sm font-extrabold backdrop-blur-md border border-emerald-400/30 z-10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-emerald-900/40 flex items-center gap-1.5">
                    <span className="drop-shadow-md">{product.ppuFormatted || product.pricePerUnit || 'N/A'}</span>
                </div>
                
                {/* FIXED: Swapped retailer reference with standard product.source type string */}
                <span className={`absolute top-3 right-3 px-2.5 py-0.5 text-[9px] font-black font-mono tracking-widest uppercase rounded-md shadow-sm text-white border z-10 ${
                    product.source === 'amazon' 
                        ? 'bg-orange-500 border-orange-400/30 shadow-orange-500/10' 
                        : 'bg-blue-600 border-blue-400/30 shadow-blue-600/10'
                }`}>
                    {product.source}
                </span>
            </div>

            <div className="flex flex-1 flex-col p-5 bg-gradient-to-b from-transparent to-muted/20">
                {product.aiVerified && (
                    <div className="mb-3 flex items-center gap-1.5 w-fit rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-400/20">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        AI Verified math
                    </div>
                )}
                
                <div className="mb-2 flex items-center gap-1 text-xs text-amber-500 font-medium">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{product.averageRating ?? (product as any).rating ?? (product as any).stars ?? 0}</span>
                    <span className="text-muted-foreground font-normal">({product.numberOfReviews ?? (product as any).reviews ?? 0})</span>
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
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                            {product.unitInfo?.formatted || 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="mt-5 flex items-center gap-2">
                    <button
                        onClick={handleShareSavings}
                        className="flex items-center justify-center border border-border bg-background p-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 active:scale-95"
                        title="Share Savings Matrix"
                        type="button"
                    >
                        <Share2 className="h-4 w-4" />
                    </button>

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
        </div>
    );
});