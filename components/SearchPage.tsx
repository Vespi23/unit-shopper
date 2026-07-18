'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, Loader2, AlertCircle, ChevronDown, ArrowRight } from 'lucide-react';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { ComparisonDrawer } from '@/components/ComparisonDrawer';
import { ComparisonView } from '@/components/ComparisonView';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { 
    convertValue, 
    calculatePricePerUnit, 
    toCanonicalUnit 
} from '@/lib/unit-parser';
import { generateProductSchema } from '@/lib/schema';

type EnhancedSortingProduct = Product & {
    pricePerUnitNumeric?: number;
    totalPriceNumeric?: number;
    unit_type?: string;
    totalAmount?: number;
    [key: string]: any;
};

interface SearchPageProps {
    initialResults?: EnhancedSortingProduct[];
    initialQuery?: string;
}

const ITEMS_PER_PAGE = 40;

function LedgerPromo() {
    return (
        <div className="w-full mt-4 p-5 sm:p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md hover:border-primary/20 dark:hover:border-rose-500/20 transition-all duration-300 animate-in fade-in slide-in-from-top-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded uppercase">
                            Lynx Ledger
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                            Deep-dive insights & analysis
                        </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground tracking-tight">
                        Looking for a breakdown on wholesale pricing games and shopping logic?
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                        Explore our clean, data-backed companion blog for detailed editorial reports, audio analysis logs, and clear media breakdowns tracking how suppliers construct bulk pricing metrics.
                    </p>
                </div>
                
                <div className="shrink-0 flex items-center pt-2 sm:pt-0">
                    <Link 
                        href="/ledger"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors group"
                    >
                        <span>Browse the ledger articles</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export function SearchPage({ initialResults = [], initialQuery = '' }: SearchPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const urlQueryParam = searchParams.get('q') || '';
    const initialUnit = searchParams.get('u') || '';
    const isExtension = searchParams.get('utm_source') === 'chrome_extension';
    
    const [results, setResults] = useState<EnhancedSortingProduct[]>(initialResults);
    const [sortBy, setSortBy] = useState<'score_asc' | 'price_asc' | 'price_desc'>('score_asc');
    const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(!!urlQueryParam);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [compareList, setCompareList] = useState<string[]>([]);
    const [showComparison, setShowComparison] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [urlQueryParam, selectedUnit]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newQuery = (formData.get('searchQuery') as string).trim();
        const params = new URLSearchParams(searchParams.toString());
        if (newQuery) params.set('q', newQuery); else params.delete('q');
        router.push(`/?${params.toString()}`, { scroll: false });
    };

    const handleUnitChange = (unit: string) => {
        setSelectedUnit(unit);
        const params = new URLSearchParams(searchParams.toString());
        if (unit) params.set('u', unit); else params.delete('u');
        router.push(`/?${params.toString()}`, { scroll: false });
    };

    useEffect(() => {
        if (!urlQueryParam) {
            setResults([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        fetch(`/api/search?q=${encodeURIComponent(urlQueryParam)}`)
            .then(res => res.json())
            .then(data => { setResults(data); setSearched(true); })
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, [urlQueryParam]); 

    const displayData = useMemo(() => {
        let processed = results.map(product => {
            const baseAmount = product.unitInfo?.value ?? product.unitInfo?.totalValue ?? product.amount ?? product.totalAmount ?? 1;
            const currentUnitType = toCanonicalUnit(product.unitInfo?.unit ?? product.unit ?? product.unit_type ?? 'count');
            
            if (!selectedUnit || selectedUnit === 'unknown') {
                return { ...product, pricePerUnitNumeric: product.score ?? (product.price / baseAmount), totalPriceNumeric: product.price };
            }

            const convertedAmount = convertValue(baseAmount, currentUnitType as any, selectedUnit as any, product.title);
            const ppu = convertedAmount && convertedAmount > 0 ? (product.price / convertedAmount) : 999999;
            return { 
                ...product, 
                pricePerUnitNumeric: ppu, 
                totalPriceNumeric: product.price,
                ppuFormatted: convertedAmount && convertedAmount > 0 ? calculatePricePerUnit(product.price, convertedAmount, selectedUnit) : 'Incompatible'
            };
        });

        processed.sort((a, b) => {
            if (sortBy === 'price_asc') return a.totalPriceNumeric - b.totalPriceNumeric;
            if (sortBy === 'price_desc') return b.totalPriceNumeric - a.totalPriceNumeric;
            return (a.pricePerUnitNumeric ?? 999999) - (b.pricePerUnitNumeric ?? 999999);
        });

        return processed.slice(0, page * ITEMS_PER_PAGE);
    }, [results, selectedUnit, sortBy, page]);

    return (
        <div className={`flex flex-col items-center w-full pb-20 ${isExtension ? 'bg-background pt-4' : ''}`}>
            {!isExtension && (
                <section className="w-full pt-24 pb-12 px-4 flex flex-col items-center text-center">
                    <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6">Shop by True Value.</h1>
                    <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl w-full">
                        <input name="searchQuery" defaultValue={urlQueryParam} placeholder="Search products..." className="flex-1 p-4 rounded-xl border bg-card text-xl" />
                        <button type="submit" className="px-8 bg-primary text-white rounded-xl font-bold">Search</button>
                    </form>
                </section>
            )}

            <section className="container px-4 mt-4 w-full max-w-7xl">
                {!loading && searched && results.length > 0 && (
                    <div className="flex gap-4 mb-6">
                        <select value={selectedUnit} onChange={(e) => handleUnitChange(e.target.value)} className="p-2 border rounded-full">
                            <option value="">Original Units</option>
                            <option value="rolls">Rolls</option>
                            <option value="sheets">Sheets</option>
                        </select>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="p-2 border rounded-full">
                            <option value="score_asc">Best Unit Value</option>
                            <option value="price_asc">Lowest Total Price</option>
                            <option value="price_desc">Highest Total Price</option>
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {loading ? Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />) : 
                     displayData.map((p, i) => <ProductCard key={p.id} product={p as any} index={i} onClick={(p) => setSelectedProduct(p)} onSelect={(id, sel) => setCompareList(prev => sel ? [...prev, id] : prev.filter(item => item !== id))} isSelected={compareList.includes(p.id)} />)}
                </div>
            </section>
        </div>
    );
}