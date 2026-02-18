'use client';

import Link from 'next/link';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { useShoppingList } from './ShoppingListContext';
import { Button } from './ui/button';
import { ShoppingListDrawer } from './ShoppingListDrawer';
import { useState } from 'react';

export function Header() {
    const { items } = useShoppingList();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <ShoppingBag className="h-5 w-5" />
                        </div>
                        <span className="hidden sm:inline-block">
                            BudgetLynx
                        </span>
                    </Link>
                    <nav className="flex items-center gap-4 text-sm font-medium">


                        <Button
                            variant="outline"
                            size="sm"
                            className="relative"
                            onClick={() => setIsDrawerOpen(true)}
                        >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            List
                            {items.length > 0 && (
                                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center border border-background">
                                    {items.length}
                                </span>
                            )}
                        </Button>
                    </nav>
                </div>
            </header>

            <ShoppingListDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </>
    );
}
