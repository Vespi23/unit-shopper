'use client';

import Link from 'next/link';
import { ModeToggle } from './ThemeToggle';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white overflow-hidden p-0.5 shadow-sm">
                        <Image src="/logo.png" alt="BudgetLynx Logo" width={38} height={38} className="object-contain drop-shadow-sm" />
                    </div>
                    <span className="hidden sm:inline-block">
                        BudgetLynx
                    </span>
                </Link>
                <nav className="flex items-center gap-5 text-sm font-medium">
                    {/* EDITORIAL LYNX LEDGER LINK ACCESS VECTOR */}
                    <Link 
                        href="/ledger" 
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold tracking-tight text-rose-500 hover:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-md transition-colors uppercase"
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Lynx Ledger</span>
                    </Link>
                    <ModeToggle />
                </nav>
            </div>
        </header>
    );
}