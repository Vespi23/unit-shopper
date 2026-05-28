'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, Loader2, AlertCircle, ChevronDown, Terminal, ArrowUpRight } from 'lucide-react';
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

interface SearchPageProps {
    initialResults?: Product[];
}

const ITEMS_PER_PAGE = 40;

// components/SearchPage.tsx - Replace or Remake the LedgerPromo function block
function LedgerPromo() {
    return (
        <div className="w-full mt-6 p-5 sm:p-6 rounded-2xl border border-border/50 bg-card/65 dark:bg-zinc-950/40 backdrop-blur-md font-sans shadow-xl shadow-black/5 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                {/* SYSTEM SPECIFICATION VECTOR BLOCK */}
                <div className="space-y-2 text-left flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black tracking-widest text-rose-500 bg-rose-500/5 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 uppercase">
                            <Terminal className="h-3 w-3" /> // WIRE OPERATIONAL
                        </span>
                        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground/80 uppercase">
                          • Articles • Audio Transcripts • Media Logs
                        </span>
                    </div>
                    
                    <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-tight">
                        See past the pricing math. Read the full investigation.
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                        When quick size sorting lookups aren't enough, access the **Lynx Ledger**. We publish deep editorial reviews, 45-minute broadcast transcripts, and 12-minute media preview logs covering bulk deal manipulation and financial optimization vectors across major suppliers.
                    </p>
                </div>
                
                {/* SYSTEM INTERCEPT LINK ACTION AREA */}
                <div className="w-full md:w-auto shrink-0 self-stretch md:self-center flex items-center">
                    <Link 
                        href="/ledger"
                        className="w-full md:w-auto px-5 py-3 md:py-2.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-800 dark:border-zinc-750 text-rose-400 hover:text-rose-300 font-mono text-xs font-bold tracking-wider rounded-xl uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/20 group active:scale-95"
                    >
                        <span>Access Wire Transcripts</span>
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                </div>
                
            </div>
        </div>
    );
}

export function SearchPage({ initialResults = [] }: SearchPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialQuery = searchParams.get('q') || '';
    const initialUnit = toCanonicalUnit(searchParams.get('u') || '');
    const isExtension = searchParams.get('utm_source') === 'chrome_extension';

    const inputRef = useRef<HTMLInputElement>(null);
    const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
    const [results, setResults] = useState<Product[]>(initialResults);
    const [sortBy, setSortBy] = useState<'score_asc' | 'price_asc' | 'price_desc'>('score_asc');
    const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(!!initialQuery);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [compareList, setCompareList] = useState<string[]>([]);
    const [showComparison, setShowComparison] = useState(false);
    const [disabledUnits] = useState<Set<string>>(new Set());
    
    const [page, setPage] = useState(1);
    
    const lastInitialResultsQuery = useRef<string | null>(null);

    useEffect(() => {
        setPage(1);
    }, [submittedQuery]);

    useEffect(() => {
        const q = searchParams.get('q') || '';
        const u = toCanonicalUnit(searchParams.get('u') || '');
        if (q !== submittedQuery) setSubmittedQuery(q);
        if (u !== selectedUnit) setSelectedUnit(u);
    }, [searchParams]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newQuery = (formData.get('searchQuery') as string).trim();

        const params = new URLSearchParams(searchParams.toString());
        if (newQuery) params.set('q', newQuery); else params.delete('q');
        if (selectedUnit) params.set('u', selectedUnit);

        router.push(`/?${params.toString()}`, { scroll: false });
        setSubmittedQuery(newQuery);
    };

    const handleUnitChange = (unit: string) => {
        const canonical = toCanonicalUnit(unit);
        setSelectedUnit(canonical);
        const params = new URLSearchParams(searchParams.toString());
        if (canonical && canonical !== 'unknown') params.set('u', canonical); else params.delete('u');
        router.push(`/?${params.toString()}`, { scroll: false });
    };

    useEffect(() => {
        async function fetchResults() {
            if (!submittedQuery) {
                setResults([]);
                setSearched(false);
                return;
            }
            if (initialResults.length > 0 && !lastInitialResultsQuery.current && submittedQuery === initialQuery) {
                lastInitialResultsQuery.current = submittedQuery;
                setSearched(true);
                return;
            }

            setLoading(true);
            setSearched(false);
            setResults([]);

            try {
                const unitParam = selectedUnit ? `&u=${encodeURIComponent(selectedUnit)}` : '';
                const res = await fetch(`/api/search?q=${encodeURIComponent(submittedQuery)}${unitParam}`);
                if (!res.ok) throw new Error('Network response was not ok');
                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
                lastInitialResultsQuery.current = submittedQuery;
            } catch (error) {
                console.error("Search failed", error);
                setResults([]);
            } finally {
                setLoading(false);
                setSearched(true);
            }
        }
        fetchResults();
    }, [submittedQuery]);

    const convertedResults = useMemo(() => {
        return results.map(product => {
            if (!selectedUnit || selectedUnit === 'unknown' || !product.unitInfo) return product;
            const convertedAmount = convertValue(product.unitInfo.totalValue, product.unitInfo.unit as any, selectedUnit as any);
            if (convertedAmount !== null && convertedAmount > 0) {
                return {
                    ...product,
                    pricePerUnit: calculatePricePerUnit(product.price, convertedAmount, selectedUnit),
                    score: product.price / convertedAmount, 
                    unitInfo: { ...product.unitInfo, formatted: `${convertedAmount.toFixed(2)} ${selectedUnit}` }
                };
            }
            return {
                ...product,
                pricePerUnit: 'N/A',
                score: 999999, 
                unitInfo: { ...product.unitInfo, formatted: `Incompatible w/ ${selectedUnit}` }
            };
        });
    }, [results, selectedUnit]);

    const availableUnits = useMemo(() => {
        const units = results
            .map(p => toCanonicalUnit(p.unitInfo?.unit || ''))
            .filter(u => u !== 'unknown') as string[];
        return Array.from(new Set(units)).sort();
    }, [results]);

    const sortedAndConvertedResults = useMemo(() => {
        return [...convertedResults].sort((a, b) => {
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            return (a.score ?? 999999) - (b.score ?? 999999);
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
                                defaultValue={submittedQuery}
                                placeholder="Search products (e.g. Toilet Paper)..."
                                className="flex-1 bg-transparent border-none outline-none text-xl h-12 ring-0 focus:ring-0"
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

                        {/* INTERCEPT ELEMENT FOR THE PRIMARY HOME / LANDING VIEW PATHWAY */}
                        {!submittedQuery && !loading && (
                            <div className="mt-8 text-left">
                                <LedgerPromo />
                            </div>
                        )}

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
                        </div>
                    </div>
                </section>
            )}

            <section className="container px-4 mt-4 w-full max-w-7xl min-h-[60vh]">
                {!loading && searched && results.length > 0 && (
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full mb-6 animate-in fade-in slide-in-from-top-2">
                        <div className="text-sm text-muted-foreground">
                            Found {results.length} results for <span className="text-foreground font-semibold">"{submittedQuery}"</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-muted-foreground">Generalize To:</label>
                                <select
                                    value={selectedUnit}
                                    onChange={(e) => handleUnitChange(e.target.value)}
                                    className="h-10 pl-4 pr-10 rounded-full border border-border bg-card text-sm font-medium shadow-sm hover:bg-accent focus:outline-none cursor-pointer transition-colors"
                                >
                                    <option value="">Original Units</option>
                                    {availableUnits.length > 0 && (
                                        <optgroup label="Detected in Results">
                                            {availableUnits.map(unit => (
                                                <option key={unit} value={unit}>
                                                    {unit === 'count' ? 'Each (ea)' : unit}
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
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="h-10 pl-4 pr-10 rounded-full border border-border bg-card text-sm font-medium shadow-sm hover:bg-accent cursor-pointer transition-colors"
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
                            <div key={product.id}>
                                <script
                                    type="application/ld+json"
                                    dangerouslySetInnerHTML={{ 
                                        __html: JSON.stringify(generateProductSchema(product)) 
                                    }}
                                />
                                <ProductCard
                                    product={product}
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
                            className="group flex items-center gap-2 px-8 py-4 bg-card border border-border rounded-2xl font-bold shadow-xl hover:bg-accent hover:border-primary/30 transition-all active:scale-95"
                        >
                            <span>Load More Products</span>
                            <ChevronDown className="h-5 w-5 text-primary group-hover:translate-y-0.5 transition-transform" />
                        </button>
                    </div>
                )}

                {/* INTERCEPT COMPONENT FOR UNMATCHED RECORD PHASES */}
                {!loading && searched && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
                        <div className="bg-muted rounded-full p-6 mb-4">
                            <AlertCircle className="h-10 w-10 text-muted-foreground opacity-20" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No qualifying results found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                            We couldn't find any products with 4+ stars and 100+ reviews for "{submittedQuery}".
                        </p>
                        
                        {/* FALLBACK SYSTEM ACCESS TRIGGER LINK */}
                        <div className="w-full max-w-2xl text-left">
                            <LedgerPromo />
                        </div>
                    </div>
                )}
            </section>

            {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
            <ComparisonDrawer selectedIds={compareList} products={results} onRemove={(id) => setCompareList(p => p.filter(i => i !== id))} onClear={() => setCompareList([])} onCompare={() => setShowComparison(true)} />
            {showComparison && <ComparisonView products={results.filter(p => compareList.includes(p.id))} onClose={() => setShowComparison(false)} />}
        </div>
    );
}