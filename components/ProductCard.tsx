'use client';

import { Product } from '@/lib/types';
import { ExternalLink, ShoppingCart, Star } from 'lucide-react';
import Image from 'next/image';
import { getAffiliateLink } from '@/lib/affiliate';

interface ProductCardProps {
    product: Product;
    onClick: () => void;
    onSelect: (selected: boolean) => void;
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

import { useShoppingList } from './ShoppingListContext';
import { Button } from './ui/button';
import { Heart, Plus, Check } from 'lucide-react';

export function ProductCard({ product, onClick, onSelect, isSelected }: ProductCardProps) {
    const { addToList, removeFromList, isInList } = useShoppingList();
    const isAdded = isInList(product.id);

    const toggleList = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isAdded) {
            removeFromList(product.id);
        } else {
            addToList(product);
        }
    };

    return (
        <div
            className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border/50 hover:border-primary/30'}`}
            onClick={onClick}
        >
            {/* Selection Checkbox */}
            <div className="absolute top-3 left-3 z-20" onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-transform hover:scale-110 shadow-sm"
                />
            </div>

            {/* Shopping List Button */}
            <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                    variant="secondary"
                    size="icon"
                    className={`h-8 w-8 rounded-full shadow-md transition-colors ${isAdded ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-white/90 hover:bg-white text-muted-foreground'}`}
                    onClick={toggleList}
                    title={isAdded ? "Remove from list" : "Add to list"}
                >
                    {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>

            {/* Image Section */}
            <div className="relative aspect-square w-full overflow-hidden bg-white p-6">
                <Image
                    src={product.image}
                    alt={product.title}
                    width={300}
                    height={300}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                />

                {/* Unit Price Badge (Hero) */}
                <div className="absolute bottom-3 right-3 bg-emerald-600 text-white dark:bg-emerald-500 shadow-lg shadow-black/20 px-3 py-1.5 rounded-full text-sm font-bold backdrop-blur-none border border-emerald-700/50 z-10 transition-transform group-hover:scale-110">
                    {product.pricePerUnit}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col p-5 bg-gradient-to-b from-transparent to-muted/20">
                <div className="mb-2 flex items-center gap-1 text-xs text-yellow-500 font-medium">
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
                    onClick={(e) => e.stopPropagation()}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-white group-hover:shadow-lg group-hover:shadow-primary/20"
                >
                    View Deal <ExternalLink className="h-4 w-4" />
                </a>
            </div>
        </div>
    );
}
