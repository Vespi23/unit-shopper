'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
    convertValue, 
    calculatePricePerUnit, 
    toCanonicalUnit 
} from '@/lib/unit-parser';

type EnhancedSortingProduct = Product & {
    pricePerUnitNumeric?: number;
    totalPriceNumeric?: number;
    ppuFormatted?: string;
    [key: string]: any;
};

interface SearchPageProps {
    initialResults?: EnhancedSortingProduct[];
    initialQuery?: string;
}

const ITEMS_PER_PAGE = 40;

function LedgerPromo() {
    return (
        <div className="w-full mt-8 p-8 rounded-3xl border border-border bg-card/50 backdrop-blur shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-2">
                    <span className="text-[11px] font-bold tracking-widest text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full uppercase">
                        Lynx Ledger
                    </span>
                    <h3 className="text-lg font-bold text-foreground">
                        Wholesale pricing games and shopping logic.
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                        Explore our clean, data-backed companion blog for detailed editorial reports, audio analysis logs, and clear media breakdowns tracking how suppliers construct bulk pricing metrics.
                    </p>
                </div>
                <Link 
                    href="/ledger"
                    className="shrink-0 flex items-center gap-2 text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors group"
                >
                    <span>Browse the ledger</span>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}

export function SearchPage({ initialResults = [] }: SearchPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const urlQueryParam = searchParams.get('q') || '';
    const initialUnit = searchParams.get('u') || '';
    const isExtension = searchParams.get('utm_source') === 'chrome_extension';
    
    const [results, setResults] = useState<EnhancedSortingProduct[]>(initialResults);
    const [sortBy, setSortBy] = useState<'ppu' | 'price_asc' | 'price_desc'>('ppu');
    const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(!!urlQueryParam);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [compareList, setCompareList] = useState<string[]>([]);
    const [page] = useState(1);

    useEffect(() => {
        if (initialResults && initialResults.length > 0) {
            setResults(initialResults);
            setSearched(true);
        }
    }, [initialResults]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newQuery = (formData.get('searchQuery') as string).trim();
        if (!newQuery) return;
        
        setLoading(true);
        setResults([]);
        setSearched(true);
        
        const params = new URLSearchParams(searchParams.toString());
        params.set('q', newQuery);
        router.push(`/?${params.toString()}`, { scroll: false });
    };

    const handleUnitChange = (unit: string) => {
        setSelectedUnit(unit);
        const params = new URLSearchParams(searchParams.toString());
        if (unit) params.set('u', unit); else params.delete('u');
        router.push(`/?${params.toString()}`, { scroll: false });
    };

    useEffect(() => {
        if (!urlQueryParam) { setResults([]); setSearched(false); setLoading(false); return; }
        setLoading(true);
        fetch(`/api/search?q=${encodeURIComponent(urlQueryParam)}`)
            .then(res => res.json())
            .then(data => { setResults(data); setSearched(true); })
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, [urlQueryParam]); 

    const detectedAvailableUnits = useMemo(() => {
        const units = results.map(p => toCanonicalUnit(p.unit ?? p.unit_type ?? '')).filter(u => u !== 'unknown') as string[];
        const uniqueSet = new Set(units);
        return Array.from(uniqueSet).sort();
    }, [results]);

    const displayData = useMemo(() => {
        let processed = results.map(product => {
            const baseAmount = product.totalAmount ?? 1;
            const currentUnitType = toCanonicalUnit(product.unit ?? 'count');
            
            if (!selectedUnit || selectedUnit === 'unknown') {
                return { ...product, pricePerUnitNumeric: product.score ?? product.price, totalPriceNumeric: product.price };
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
            if (sortBy === 'price_asc') return (a.totalPriceNumeric ?? 0) - (b.totalPriceNumeric ?? 0);
            if (sortBy === 'price_desc') return (b.totalPriceNumeric ?? 0) - (a.totalPriceNumeric ?? 0);
            return (a.pricePerUnitNumeric ?? 999999) - (b.pricePerUnitNumeric ?? 999999);
        });

        return processed.slice(0, page * ITEMS_PER_PAGE);
    }, [results, selectedUnit, sortBy, page]);

    return (
        <div className={`flex flex-col items-center w-full pb-20 ${isExtension ? 'bg-background pt-4' : ''}`}>
            {!isExtension && (
                <section className="w-full pt-32 pb-20 px-4 flex flex-col items-center text-center bg-gradient-to-b from-emerald-50/50 via-background to-background">
                    <h1 className="text-5xl md:text-8xl font-extrabold tracking-tighter mb-8 text-foreground">
                        Shop by <span className="text-emerald-600">True Value</span>.
                    </h1>
                    
                    <div className="relative w-full max-w-3xl z-10">
                        <form onSubmit={handleSearch} className="flex items-center bg-card shadow-2xl rounded-3xl border border-border p-3 gap-2">
                            <Search className="h-7 w-7 text-muted-foreground ml-3" />
                            <input name="searchQuery" defaultValue={urlQueryParam} placeholder="Search products..." className="flex-1 bg-transparent p-4 text-xl outline-none text-foreground placeholder:text-muted-foreground" />
                            <button type="submit" className="px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all">Search</button>
                        </form>
                    </div>
                </section>
            )}

            <section className="container px-6 mt-8 w-full max-w-7xl">
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                        {Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                )}

                {searched && !loading && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-bold text-foreground">No results found</h2>
                        <p className="text-muted-foreground mt-2">Try adjusting your search terms.</p>
                    </div>
                )}

                {searched && !loading && results.length > 0 && (
                    <>
                        <div className="flex flex-col sm:flex-row gap-6 mb-10 items-center justify-between">
                            <p className="text-lg text-muted-foreground font-medium">
                                Found <span className="font-bold text-foreground">{results.length}</span> results for <span className="font-bold text-foreground">"{urlQueryParam}"</span>
                            </p>
                            <div className="flex gap-4">
                                <select value={selectedUnit} onChange={(e) => handleUnitChange(e.target.value)} className="px-5 py-3 rounded-full border border-border bg-card font-semibold text-sm outline-none cursor-pointer hover:bg-accent text-foreground transition-colors">
                                    <option value="">Original Units</option>
                                    {detectedAvailableUnits.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                                </select>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-5 py-3 rounded-full border border-border bg-card font-semibold text-sm outline-none cursor-pointer hover:bg-accent text-foreground transition-colors">
                                    <option value="ppu">Best Unit Value</option>
                                    <option value="price_asc">Lowest Total Price</option>
                                    <option value="price_desc">Highest Total Price</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                            {displayData.map((p, i) => (
                                <ProductCard 
                                    key={`${p.id}-${i}`} 
                                    product={p as any} 
                                    index={i}
                                    onClick={setSelectedProduct}
                                    onSelect={(id, sel) => setCompareList(prev => sel ? [...prev, id] : prev.filter(item => item !== id))}
                                    isSelected={compareList.includes(p.id)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}