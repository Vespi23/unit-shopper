import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export function Header() {
    return (
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
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <Link href="/" className="transition-colors hover:text-primary">
                        Search
                    </Link>
                    <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">
                        About
                    </Link>
                    {/* Dark Mode Toggle could go here later */}
                </nav>
            </div>
        </header>
    );
}
