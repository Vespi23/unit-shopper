
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@/lib/types';

interface ShoppingListContextType {
    items: Product[];
    addToList: (product: Product) => void;
    removeFromList: (productId: string) => void;
    isInList: (productId: string) => boolean;
    totalCost: number;
    totalSavings: number; // Placeholder for now
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined);

export function ShoppingListProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Product[]>([]);

    // Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('shopping-list');
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse shopping list', e);
            }
        }
    }, []);

    // Save to LocalStorage on change
    useEffect(() => {
        localStorage.setItem('shopping-list', JSON.stringify(items));
    }, [items]);

    const addToList = (product: Product) => {
        setItems(prev => {
            if (prev.some(p => p.id === product.id)) return prev;
            return [...prev, product];
        });
    };

    const removeFromList = (productId: string) => {
        setItems(prev => prev.filter(p => p.id !== productId));
    };

    const isInList = (productId: string) => {
        return items.some(p => p.id === productId);
    };

    const totalCost = items.reduce((sum, item) => sum + item.price, 0);
    // Rough savings calc (assuming originalPrice > price)
    const totalSavings = items.reduce((sum, item) => {
        if (item.originalPrice && item.originalPrice > item.price) {
            return sum + (item.originalPrice - item.price);
        }
        return sum;
    }, 0);

    return (
        <ShoppingListContext.Provider value={{ items, addToList, removeFromList, isInList, totalCost, totalSavings }}>
            {children}
        </ShoppingListContext.Provider>
    );
}

export function useShoppingList() {
    const context = useContext(ShoppingListContext);
    if (context === undefined) {
        throw new Error('useShoppingList must be used within a ShoppingListProvider');
    }
    return context;
}
