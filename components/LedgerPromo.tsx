'use client';

import Link from 'next/link';
import { Terminal, ArrowUpRight } from 'lucide-react';

export function LedgerPromo() {
    return (
        <div className="w-full my-8 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-sans shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1.5 text-left">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black tracking-widest text-rose-500 uppercase">
                        <Terminal className="h-3.5 w-3.5" /> // SYSTEM WIRE // INTEL BROADCAST
                    </div>
                    <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                        Deep Compliance Reviews & Financial Engineering Transcripts
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                        Access raw metadata summaries, podcast audio logs, and dynamic technical writeups inside the immersive **Lynx Ledger** engine at budgetlynx.com/ledger.
                    </p>
                </div>
                
                <Link 
                    href="/ledger"
                    className="w-full md:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-800 dark:border-zinc-750 rounded-lg text-xs font-mono font-bold tracking-wider text-rose-400 hover:text-rose-300 uppercase transition-all flex items-center justify-center gap-1.5 group"
                >
                    <span>Open Ledger</span>
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
            </div>
        </div>
    );
}