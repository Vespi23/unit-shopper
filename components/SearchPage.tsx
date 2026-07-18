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

    const inputRef = useRef<HTMLInputElement>(null);
    
    const [results, setResults] = useState<EnhancedSortingProduct[]>(initialResults);
    const [sortBy, setSortBy] = useState<'score_asc' | 'price_asc' | 'price_desc'>('score_asc');
    const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(!!urlQueryParam);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [compareList, setCompareList] = useState<string[]>([]);
    const [showComparison, setShowComparison] = useState(false);
    const [disabledUnits] = useState<Set<string>>(new Set());
    
    const [page, setPage] = useState(1);
    
    // Explicit network query tracking string to isolate dynamic text entry blocks completely
    const [activeFetchedQuery, setActiveFetchedQuery] = useState<string>('');

    useEffect(() => {
        setPage(1);
    }, [urlQueryParam, sortBy, selectedUnit]);

    useEffect(() => {
        const u = searchParams.get('u') || '';
        if (u !== selectedUnit) setSelectedUnit(u);
    }, [searchParams]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newQuery = (formData.get('searchQuery') as string).trim();

        const params = new URLSearchParams(searchParams.toString());
        if (newQuery) params.set('q', newQuery); else params.delete('q');
        if (selectedUnit) params.set('u', selectedUnit);

        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        router.push(`${currentPath}?${params.toString()}`, { scroll: false });
    };

    const handleUnitChange = (unit: string) => {
        setSelectedUnit(unit);
        const params = new URLSearchParams(searchParams.toString());
        if (unit) params.set('u', unit); else params.delete('u');

        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        router.push(`${currentPath}?${params.toString()}`, { scroll: false });
    };

    // SUBSEQUENT TRIGGER CONTROL ENGINE: Guarantees immediate fetch execution when search text updates
    useEffect(() => {
        async function fetchResults() {
            if (!urlQueryParam) {
                setResults([]);
                setSearched(false);
                setActiveFetchedQuery('');
                return;
            }

            setLoading(true);
            setSearched(false);
            setResults([]); 

            try {
                const unitParam = selectedUnit ? `&u=${encodeURIComponent(selectedUnit)}` : '';
                const res = await fetch(`/api/search?q=${encodeURIComponent(urlQueryParam)}${unitParam}`, {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Pragma': 'no-cache',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (!res.ok) throw new Error('Network response failure');
                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
                setActiveFetchedQuery(urlQueryParam);
            } catch (error) {
                console.error("[BUDGETLYNX_SCRAPE_DROP]: Fetch task failed:", error);
                setResults([]);
            } finally {
                setLoading(false);
                setSearched(true);
            }
        }
        fetchResults();
    }, [urlQueryParam]); 

    // REAL-TIME DROPDOWN TRANSFORM ENGINE: Cooperates natively with the lib utility
    const convertedResults = useMemo(() => {
        return results.map(product => {
            const baseTitle = String(product.title || product.name || "");
            
            // Standardize item volume extraction keys
            const baseAmount = product.unitInfo?.value ?? product.unitInfo?.totalValue ?? product.amount ?? product.totalAmount ?? 1;
            const currentUnitType = toCanonicalUnit(product.unitInfo?.unit ?? product.unit ?? product.unit_type ?? 'count');

            // ORIGINAL SELECTION STATE PASS
            if (!selectedUnit || selectedUnit === 'unknown') {
                const verifiedBaseScore = typeof product.score === 'number' ? product.score : (product.price / baseAmount);
                return {
                    ...product,
                    pricePerUnitNumeric: verifiedBaseScore,
                    totalPriceNumeric: product.price,
                    unitInfo: {
                        formatted: product.unitInfo?.formatted ?? `${baseAmount} ${currentUnitType}`,
                        value: baseAmount,
                        unit: currentUnitType,
                        quantity: product.unitInfo?.quantity ?? 1,
                        totalValue: baseAmount
                    }
                };
            }
            
            // Call our centralized library system to process paper conversions natively
            const convertedAmount = convertValue(baseAmount, currentUnitType as any, selectedUnit as any, baseTitle);
            
            if (convertedAmount !== null && convertedAmount > 0) {
                const newPPUString = calculatePricePerUnit(product.price, convertedAmount, selectedUnit);
                return {
                    ...product,
                    pricePerUnit: newPPUString, 
                    pricePerUnitNumeric: product.price / convertedAmount,
                    totalPriceNumeric: product.price,
                    score: product.price / convertedAmount,
                    ppuFormatted: newPPUString,
                    unitInfo: { 
                        formatted: `${convertedAmount.toFixed(2)} ${selectedUnit === 'count' ? 'ea' : selectedUnit === 'rolls' ? 'rolls' : selectedUnit === 'sheets' ? 'sheets' : selectedUnit}`,
                        value: convertedAmount,
                        unit: selectedUnit,
                        quantity: product.unitInfo?.quantity ?? 1,
                        totalValue: convertedAmount
                    }
                };
            }

            return {
                ...product,
                pricePerUnit: 'Incompatible',
                pricePerUnitNumeric: 999999,
                totalPriceNumeric: product.price,
                score: 999999,
                ppuFormatted: 'Incompatible',
                unitInfo: { 
                    formatted: `Incompatible w/ ${selectedUnit}`,
                    value: baseAmount,
                    unit: currentUnitType,
                    quantity: product.unitInfo?.quantity ?? 1,
                    totalValue: baseAmount
                }
            };
        });
    }, [results, selectedUnit]);

    const availableUnits = useMemo(() => {
        const units = results
            .map(p => toCanonicalUnit(p.unitInfo?.unit ?? p.unit ?? p.unit_type ?? ''))
            .filter(u => u !== 'unknown') as string[];
            
        const uniqueSet = new Set(units);
        const queryLower = urlQueryParam.toLowerCase();
        
        if (queryLower.includes('toilet') || queryLower.includes('paper') || queryLower.includes('tissue') || queryLower.includes('towel') || queryLower.includes('wipe')) {
            uniqueSet.add('rolls');
            uniqueSet.add('sheets');
        }
        
        return Array.from(uniqueSet).sort();
    }, [results, urlQueryParam]);

    const sortedAndConvertedResults = useMemo(() => {
        // Log to verify the trigger occurs on dropdown change
        console.log(`[SORT_DEBUG]: Sorting by ${sortBy} with ${convertedResults.length} items`);
        
        return [...convertedResults].sort((a, b) => {
            // Strategy 1: Lowest Price
            if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
            
            // Strategy 2: Highest Price
            if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
            
            // Strategy 3: Best Unit Value (Default)
            const valA = (typeof a.pricePerUnitNumeric === 'number' && a.pricePerUnitNumeric > 0) ? a.pricePerUnitNumeric : 999999;
            const valB = (typeof b.pricePerUnitNumeric === 'number' && b.pricePerUnitNumeric > 0) ? b.pricePerUnitNumeric : 999999;
            
            return valA - valB;
        });
    }, [convertedResults, sortBy]);

    const filteredResults = useMemo(() => {
        return sortedAndConvertedResults.filter(p => !p.unitInfo?.unit || !disabledUnits.has(p.unitInfo.unit));
    }, [sortedAndConvertedResults, disabledUnits]);

    const paginatedDisplayResults = useMemo(() => {
        return filteredResults.slice(0, page * ITEMS_PER_PAGE);
    }, [filteredResults, page]);

    const hasMore = paginatedDisplayResults.length < filteredResults.length;

    return (
        <div className={`flex flex-col items-center w-full pb-20 ${isExtension ? 'bg-background pt-4' : ''}`}>
            
            {!isExtension && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            "url": "https://www.budgetlynx.com/",
                            "potentialAction": {
                                "@type": "SearchAction",
                                "target": "https://www.budgetlynx.com/?q={search_term_string}",
                                "query-input": "required name=search_term_string"
                            }
                        })
                    }}
                />
            )}

            {!isExtension && (
                <section className="w-full bg-gradient-to-b from-emerald-50/50 via-background to-background pt-24 pb-12 px-4 flex flex-col items-center text-center">
                    <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 precision-header">
                        Shop by True Value.
                    </h1>
                    
                    <div className="relative w-full max-w-2xl group z-10">
                        <form onSubmit={handleSearch} className="relative flex items-center bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-2xl p-2 transition-all focus-within:ring-2 focus-within:ring-primary/30">
                            <Search className="h-6 w-6 text-muted-foreground ml-4 mr-3" />
                            <input
                                ref={inputRef}
                                name="searchQuery"
                                type="text"
                                key={urlQueryParam}
                                defaultValue={urlQueryParam}
                                placeholder="Search products (e.g. Toilet Paper)..."
                                className="flex-1 bg-transparent border-none outline-none text-xl h-12 ring-0 focus:ring-0 text-foreground"
                            />
                            {loading ? (
                                <div className="flex items-center gap-2 mr-4">
                                    <span className="text-xs font-bold text-primary animate-pulse hidden sm:block">Deep Scraping...</span>
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/10">
                                    Search
                                </button>
                            )}
                        </form>

                        <div className="mt-8 hidden sm:block animate-in fade-in zoom-in duration-700 delay-300">
                            <div className="glass dark:glass-dark rounded-2xl border border-primary/20 p-4 flex items-center justify-between gap-6 shadow-xl lynx-glow">
                                <div className="flex items-center gap-4">
                                    <div className="relative h-10 w-10 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm border overflow-hidden">
                                        <Image src="/extension-logo.png" alt="Lynx Vision" width={38} height={38} className="object-contain" />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-foreground">Lynx Vision</p>
                                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Verified Tool</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-none mt-1">
                                            Automatic unit price comparisons while you shop on Amazon.
                                        </p>
                                    </div>
                                </div>
                                <a 
                                    href="https://chromewebstore.google.com/detail/lynx-vision/eoihkpljhmakhpecnobkcnjofidebmhl"
                                    target="_blank" rel="noopener noreferrer"
                                    className="bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95 shadow-md"
                                >
                                    Add to Chrome
                                </a>
                            </div>

                            {!urlQueryParam && !loading && (
                                <LedgerPromo />
                            )}
                        </div>
                    </div>
                </section>
            )}

            <section className="container px-4 mt-4 w-full max-w-7xl min-h-[60vh]">
                {!loading && searched && results.length > 0 && (
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full mb-6 animate-in fade-in slide-in-from-top-2">
                        <div className="text-sm text-muted-foreground">
                            Found {results.length} results for <span className="text-foreground font-semibold">"{urlQueryParam}"</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-muted-foreground">Generalize To:</label>
                                <select
                                    value={selectedUnit}
                                    onChange={(e) => handleUnitChange(e.target.value)}
                                    className="h-10 pl-4 pr-10 rounded-full border border-border bg-card text-sm font-medium shadow-sm hover:bg-accent focus:outline-none cursor-pointer transition-colors text-foreground"
                                >
                                    <option value="">Original Units</option>
                                    {availableUnits.length > 0 && (
                                        <optgroup label="Detected in Results">
                                            {availableUnits.map(unit => (
                                                <option key={unit} value={unit}>
                                                    {unit === 'count' ? 'Each (ea)' : unit === 'rolls' ? 'Rolls (roll)' : unit === 'sheets' ? 'Sheets (sh)' : unit}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    <optgroup label="Weights/Volume">
                                        <option value="oz">Ounces (oz)</option>
                                        <option value="lb">Pounds (lb)</option>
                                        <option value="fl oz">Fluid Oz (fl oz)</option>
                                        <option value="gal">Gallons (gal)</option>
                                    </optgroup>
                                </select>
                            </div>
                            
                            {/* FIXED SELECT SYNCHRONIZATION LAYER */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="h-10 pl-4 pr-10 rounded-full border border-border bg-card text-sm font-medium shadow-sm hover:bg-accent focus:outline-none cursor-pointer transition-colors text-foreground font-semibold"
                            >
                                <option value="score_asc">Best Unit Value</option>
                                <option value="price_asc">Lowest Total Price</option>
                                <option value="price_desc">Highest Total Price</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {loading ? (
                        Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
                    ) : (
                        paginatedDisplayResults.map((product, index) => (
                            <div key={product.id} className="animate-in fade-in zoom-in-95 duration-300">
                                <script
                                    type="application/ld+json"
                                    dangerouslySetInnerHTML={{ 
                                        __html: JSON.stringify(generateProductSchema(product)) 
                                    }}
                                />
                                <ProductCard
                                    product={product as any}
                                    index={index}
                                    onClick={(p) => setSelectedProduct(p)}
                                    onSelect={(id, sel) => setCompareList(prev => sel ? [...prev, id] : prev.filter(i => i !== id))}
                                    isSelected={compareList.includes(product.id)}
                                />
                            </div>
                        ))
                    )}
                </div>

                {!loading && searched && hasMore && (
                    <div className="flex justify-center mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <button 
                            onClick={() => setPage(prev => prev + 1)}
                            className="group flex items-center gap-2 px-8 py-4 bg-card border border-border rounded-2xl font-bold shadow-xl hover:bg-accent hover:border-primary/30 transition-all active:scale-95 text-foreground"
                        >
                            <span>Load More Products</span>
                            <ChevronDown className="h-5 w-5 text-primary group-hover:translate-y-0.5 transition-transform" />
                        </button>
                    </div>
                )}

                {!loading && searched && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
                        <div className="bg-muted rounded-full p-6 mb-4">
                            <AlertCircle className="h-10 w-10 text-muted-foreground opacity-20" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No qualifying results found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                            We couldn't find any verified product value matches (4+ stars, 100+ reviews) for "{urlQueryParam}".
                        </p>
                        
                        <div className="w-full max-w-2xl text-left">
                            <LedgerPromo />
                        </div>
                    </div>
                )}
            </section>

            {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
            <ComparisonDrawer selectedIds={compareList} products={results as any} onRemove={(id) => setCompareList(prev => prev.filter(item => item !== id))} onClear={() => setCompareList([])} onCompare={() => setShowComparison(true)} />
            {showComparison && <ComparisonView products={results.filter(p => compareList.includes(p.id)) as any} onClose={() => setShowComparison(false)} />}
        </div>
    );
}