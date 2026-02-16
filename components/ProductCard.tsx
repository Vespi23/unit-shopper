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

export function ProductCard({ product, onClick, onSelect, isSelected }: ProductCardProps) {
    const isAmazon = product.source === 'amazon';

    return (
        <div
            className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
            onClick={onClick}
        >
            {/* Selection Checkbox */}
            <div className="absolute top-0 left-0 z-20 p-3" onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-transform hover:scale-110"
                />
            </div>

            {/* Image Section */}
            <div className="relative aspect-square w-full overflow-hidden bg-muted p-4">
                <Image
                    src={product.image}
                    alt={product.title}
                    width={200}
                    height={200}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 mix-blend-multiply dark:mix-blend-normal"
                />
                {/* Source Badge */}
                <div className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-medium text-white ${isAmazon ? 'bg-orange-500' : 'bg-blue-600'}`}>
                    {isAmazon ? 'Amazon' : 'Walmart'}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 text-sm font-medium leading-tight min-h-[2.5rem]" title={product.title}>
                    {product.title}
                </h3>

                <div className="mt-4 flex items-end justify-between">
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold tracking-tight text-primary">
                            {product.pricePerUnit}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                            Unit Price
                        </span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-lg font-semibold">
                            ${product.price.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Total
                        </span>
                    </div>
                </div>

                {/* Detail Info */}
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{product.unitInfo?.formatted || 'N/A'}</span>
                    <div className="flex items-center gap-1">
                        <span>⭐ {product.rating}</span>
                    </div>
                </div>

                {/* Action Button */}
                <a
                    href={getAffiliateLink(product)}
                    onClick={(e) => e.stopPropagation()}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                >
                    <ExternalLink className="h-4 w-4" />
                    View Deal
                </a>
            </div>
        </div>
    );
}
