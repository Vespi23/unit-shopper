'use client';

import { Product } from '@/lib/types';
import { X, ArrowRightLeft } from 'lucide-react';

interface ComparisonDrawerProps {
    selectedIds: string[];
    products: Product[];
    onRemove: (id: string) => void;
    onClear: () => void;
    onCompare: () => void;
}

export function ComparisonDrawer({ selectedIds, products, onRemove, onClear, onCompare }: ComparisonDrawerProps) {
    if (selectedIds.length === 0) return null;

    const selectedProducts = products.filter(p => selectedIds.includes(p.id));

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] p-4 animate-in slide-in-from-bottom duration-300">
            <div className="container max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <div className="text-sm font-medium text-muted-foreground whitespace-nowrap hidden sm:block">
                        Compare ({selectedIds.length}/4):
                    </div>
                    <div className="flex gap-2">
                        {selectedProducts.map(product => (
                            <div key={product.id} className="relative group flex items-center gap-2 bg-muted/50 pl-2 pr-8 py-1.5 rounded-full border border-border text-sm">
                                <span className="truncate max-w-[100px] md:max-w-[150px]">{product.title}</span>
                                <button
                                    onClick={() => onRemove(product.id)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 pl-4 border-l border-border">
                    <button
                        onClick={onClear}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={onCompare}
                        disabled={selectedIds.length < 2}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowRightLeft className="w-4 h-4" /> Compare
                    </button>
                </div>
            </div>
        </div>
    );
}
