
'use client';

import { useShoppingList } from './ShoppingListContext';
import { Button } from './ui/button';
import { ShoppingCart, X, Trash2, Printer } from 'lucide-react';
import { useState } from 'react';
import { Product } from '@/lib/types';
import Image from 'next/image';

export function ShoppingListDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { items, removeFromList, totalCost, totalSavings } = useShoppingList();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-background h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        <h2 className="font-bold text-lg">Shopping List ({items.length})</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* List Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Your list is empty.</p>
                            <p className="text-sm">Start searching to add items!</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                                <div className="relative w-16 h-16 flex-shrink-0 bg-white rounded-md overflow-hidden border">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        className="object-contain p-1"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm line-clamp-2 leading-tight mb-1" title={item.title}>
                                        {item.title}
                                    </h3>
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm font-bold text-primary">
                                            ${item.price.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full capitalize">
                                            {item.source}
                                        </div>
                                    </div>
                                    {item.pricePerUnit && item.pricePerUnit !== 'N/A' && (
                                        <div className="text-xs text-green-600 font-medium mt-1">
                                            {item.pricePerUnit}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeFromList(item.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer / Totals */}
                <div className="p-4 border-t bg-muted/10 space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Est. Total:</span>
                            <span className="font-bold text-lg">${totalCost.toFixed(2)}</span>
                        </div>
                        {totalSavings > 0 && (
                            <div className="flex justify-between text-xs text-green-600 font-medium">
                                <span>Est. Savings:</span>
                                <span>-${totalSavings.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="w-full" onClick={() => window.print()}>
                            <Printer className="w-4 h-4 mr-2" />
                            Print List
                        </Button>
                        <Button className="w-full" onClick={onClose}>
                            Keep Shopping
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
