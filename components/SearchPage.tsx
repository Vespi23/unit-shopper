'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, Loader2, Filter, X, Info } from 'lucide-react';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { ComparisonDrawer } from '@/components/ComparisonDrawer';
import { ComparisonView } from '@/components/ComparisonView';
import { useRouter, useSearchParams } from 'next/navigation';

import { FeaturesSection } from '@/components/FeaturesSection';
import { TrendingCategories } from '@/components/TrendingCategories';
import { convertValue, calculatePricePerUnit } from '@/lib/unit-parser';
import { generateProductSchema } from '@/lib/schema';

interface SearchPageProps {
    initialResults?: Product[];
}

const ITEMS_PER_PAGE = 40;

export function SearchPage({ initialResults = [] }: SearchPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialQuery = searchParams.get('q') || '';
    const isExtension = searchParams.get('utm_source') === 'chrome_extension';

    const inputRef = useRef<HTMLInputElement>(null);
    const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
    const [results, setResults] = useState<Product[]>(initialResults);
    const [sortBy, setSortBy] = useState<'score_asc' | 'price_asc' | 'price_desc'>('score_asc');
    const [selectedUnit, setSelectedUnit] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(!!initialQuery);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [compareList, setCompareList] = useState<string[]>([]);
    const [showComparison, setShowComparison] = useState(false);
    const [disabledUnits, setDisabledUnits] = useState<Set<string>>(new Set());
    
    const [page, setPage] = useState(1);
    const lastInitialResultsQuery = useRef<string | null>(null);

    useEffect(() => {
        if (initialResults) {
            const activeQuery = new URLSearchParams(window.location.search).get('q');

            if (initialResults.length === 0) {
                if (!activeQuery) {
                    setResults([]);
                    setSearched(false);
                    setSubmittedQuery('');
                }
                return; 
            }

            setResults(initialResults);
            setSearched(true);
            setLoading(false);
            setPage(1);
            lastInitialResultsQuery.current = activeQuery;
        }
    }, [initialResults]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const formData = new FormData(e.currentTarget);
        const newQuery = (formData.get('searchQuery') as string).trim();

        if (newQuery !== searchParams.get('q')) {
            setLoading(true);
            const params = new URLSearchParams(searchParams.toString());
            if (newQuery) {
                params.set('q', newQuery);
            } else {
                params.delete('q');
            }
            router.push(`/?${params.toString()}`, { scroll: false });
        } else if (newQuery.length > 0) {
            setPage(1);
            return;
        }

        if (newQuery.length > 0) {
            setSubmittedQuery(newQuery);
            setPage(1);
        } else if (newQuery.length === 0) {
            setResults([]);
            setSearched(false);
            setPage(1);
            setSubmittedQuery('');
        }
    };

    useEffect(() => {
        setDisabledUnits(new Set());
    }, [submittedQuery, selectedUnit]);

    useEffect(() => {
        async function fetchResults() {
            if (!submittedQuery) return;

            if (initialResults.length > 0 && lastInitialResultsQuery.current === submittedQuery) {
                return;
            }

            setLoading(true);
            setSearched(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(submittedQuery)}`);
                const data = await res.json();
                const newResults = Array.isArray(data) ? data : [];
                setResults(newResults);
                setPage(1);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setLoading(false);
            }
        }
        fetchResults();
    }, [submittedQuery]); 

    const toggleCompare = useCallback((productId: string, selected: boolean) => {
        setCompareList(prev => {
            if (selected) {
                if (prev.length < 4) return [...prev, productId];
                alert("You can compare up to 4 products.");
                return prev;
            }
            return prev.filter(id => id !== productId);
        });
    }, []);

    const handleProductClick = useCallback((product: Product) => {
        setSelectedProduct(product);
    }, []);

    const convertedResults = useMemo(() => {
        return results.map(product => {
            if (!selectedUnit || !product.unitInfo) return product;
            const convertedAmount = convertValue(product.unitInfo.totalValue, product.unitInfo.unit as any, selectedUnit as any);

            if (convertedAmount !== null) {
                return {
                    ...product,
                    pricePerUnit: calculatePricePerUnit(product.price, convertedAmount, selectedUnit as string),
                    score: product.price / convertedAmount, 
                    unitInfo: {
                        ...product.unitInfo,
                        formatted: `${Number.isInteger(convertedAmount) ? convertedAmount : convertedAmount.toFixed(2)} ${selectedUnit}`
                    }
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

    const sortedAndConvertedResults = useMemo(() => {
        return [...convertedResults].sort((a, b) => {
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            return (a.score ?? 999999) - (b.score ?? 999999);
        });
    }, [convertedResults, sortBy]);

    const availableUnits = useMemo(() => {
        const units = Array.from(new Set(convertedResults.map(p => p.unitInfo?.unit).filter(Boolean))) as string[];
        return units.sort();
    }, [convertedResults]);

    useEffect(() => {
        if (!selectedUnit && results.length > 0) {
            const firstValidUnit = results.find(p => p.unitInfo?.unit)?.unitInfo?.unit;
            if (firstValidUnit) setSelectedUnit(firstValidUnit);
            else if (availableUnits.length > 0) setSelectedUnit(availableUnits[0]);
        }
    }, [results, availableUnits, selectedUnit]);

    const displayResults = useMemo(() => {
        return sortedAndConvertedResults.filter(product => {
            return !product.unitInfo?.unit || !disabledUnits.has(product.unitInfo.unit);
        });
    }, [sortedAndConvertedResults, disabledUnits]);

    const paginatedDisplayResults = useMemo(() => {
        return displayResults.slice(0, page * ITEMS_PER_PAGE);
    }, [displayResults, page]);

    return (
        <div className={`flex flex-col items-center w-full pb-20 ${isExtension ? 'bg-background pt-4' : ''}`}>
            {!loading && paginatedDisplayResults.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(paginatedDisplayResults.map(p => generateProductSchema(p))) }}
                />
            )}
            
            {/* Hero Section */}
            {!isExtension && (
            <section className="w-full bg-gradient-to-b from-emerald-50/50 via-background to-background pt-24 pb-4 px-4 flex flex-col items-center text-center">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground mb-6 uppercase tracking-wider shadow-sm">
                    Beta
                </div>
                <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                    See What Others Miss.
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
                    Don't let confusing package sizes trick you. <strong>BudgetLynx</strong> reveals the true unit price so you can shop smarter.
                </p>

                {/* Search Input */}
                <div className="relative w-full max-w-2xl group z-10">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 opacity-20 blur-xl transition duration-500 group-hover:opacity-40 group-focus-within:opacity-50"></div>
                    <form onSubmit={handleSearch} className="relative flex items-center bg-card rounded-2xl border border-border/50 shadow-lg p-2 transition-shadow focus-within:shadow-xl focus-within:shadow-emerald-900/10">
                        <Search className="h-6 w-6 text-muted-foreground ml-4 mr-3" />
                        <input
                            ref={inputRef}
                            name="searchQuery"
                            type="text"
                            defaultValue={initialQuery}
                            placeholder="Search for peanut butter, laundry detergent..."
                            className="flex-1 bg-transparent border-none outline-none text-xl placeholder:text-muted-foreground/70 h-12 ring-0 focus:ring-0"
                            autoFocus
                            aria-label="Search products"
                        />
                        {loading ? (
                            <div className="flex items-center mr-4 shrink-0 pointer-events-none">
                                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2.5" />
                                <span className="text-sm font-semibold text-primary animate-pulse hidden sm:inline-block">Scanning...</span>
                            </div>
                        ) : (
                            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 hidden sm:block">
                                Search
                            </button>
                        )}
                    </form>
                </div>

                {!searched && (
                    <TrendingCategories onSelect={(q) => {
                        if (inputRef.current) inputRef.current.value = q;
                        setLoading(true);
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('q', q);
                        router.push(`/?${params.toString()}`, { scroll: false });
                        setSubmittedQuery(q);
                        setPage(1);
                    }} />
                )}
            </section>
            )}

            {!searched && !isExtension && <FeaturesSection />}

            {/* CLS SHOCK ABSORBER: min-h-[60vh] to stop footer jumping */}
            <section className="container px-4 mt-4 w-full max-w-7xl min-h-[60vh]">
                
                {/* CLS SHOCK ABSORBER: Pre-reserve height for conditional headers */}
                {searched && (
                    <div className="w-full min-h-[140px] md:min-h-[100px] flex flex-col justify-end mb-6">
                        {loading ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border/40 animate-pulse w-full">
                                <div className="h-4 w-24 bg-muted-foreground/20 rounded"></div>
                                <div className="flex gap-2">
                                    <div className="h-8 w-20 bg-muted-foreground/20 rounded-full"></div>
                                    <div className="h-8 w-24 bg-muted-foreground/20 rounded-full"></div>
                                    <div className="h-8 w-16 bg-muted-foreground/20 rounded-full"></div>
                                </div>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center py-8">
                                <h2 className="text-lg font-semibold">No results found</h2>
                                <p className="text-muted-foreground">Try searching for generic terms.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full">
                                    <div className="text-sm text-muted-foreground font-medium">
                                        Found {displayResults.length} results for <span className="text-foreground">"{submittedQuery}"</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                        {availableUnits.length > 0 && (
                                            <div className="flex items-center gap-3">
                                                <label htmlFor="unit-select" className="text-sm font-medium text-muted-foreground flex items-center">
                                                    Units:
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        id="unit-select"
                                                        value={selectedUnit}
                                                        onChange={(e) => setSelectedUnit(e.target.value as any)}
                                                        className="appearance-none h-10 pl-4 pr-10 rounded-full border border-border bg-card text-sm font-medium shadow-sm hover:bg-accent focus:outline-none cursor-pointer"
                                                    >
                                                        {availableUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                                                        <option disabled>──────</option>
                                                        <option value="oz">oz (Weight)</option>
                                                        <option value="lb">lb</option>
                                                        <option value="fl oz">fl oz (Vol)</option>
                                                        <option value="gal">gal</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
                                        <div className="flex items-center gap-3">
                                            <label htmlFor="sort-select" className="text-sm font-medium text-muted-foreground">Sort by:</label>
                                            <div className="relative">
                                                <select
                                                    id="sort-select"
                                                    value={sortBy}
                                                    onChange={(e) => setSortBy(e.target.value as any)}
                                                    className="appearance-none h-10 pl-4 pr-10 rounded-full border border-border bg-card text-sm font-medium shadow-sm hover:bg-accent focus:outline-none cursor-pointer"
                                                >
                                                    <option value="score_asc">Lowest Unit Price</option>
                                                    <option value="price_asc">Lowest Total Price</option>
                                                    <option value="price_desc">Highest Total Price</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {availableUnits.length > 0 && (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border/40 w-full">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-fit">
                                            <Filter className="w-4 h-4" />
                                            <span>Filter Units:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {availableUnits.map(unit => {
                                                const isActive = !disabledUnits.has(unit);
                                                return (
                                                    <button
                                                        key={unit}
                                                        onClick={() => {
                                                            const next = new Set(disabledUnits);
                                                            if (next.has(unit)) next.delete(unit);
                                                            else next.add(unit);
                                                            setDisabledUnits(next);
                                                        }}
                                                        className={`group relative inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 border select-none ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent'}`}
                                                    >
                                                        {unit}
                                                        {isActive && <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {results.length > 0 && !loading && (
                    <div className="w-full text-center mb-6">
                        <p className="text-xs text-muted-foreground">As an Amazon Associate I earn from qualifying purchases.</p>
                    </div>
                )}

                <h2 className="sr-only">Search Results</h2>

                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${isExtension ? 'xl:grid-cols-5 2xl:grid-cols-6' : 'xl:grid-cols-5'} gap-4 lg:gap-6`}>
                    {loading ? (
                        <>
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                                <div className="flex items-center gap-3 mb-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                                        Analyzing Price-Per-Unit Data...
                                    </h3>
                                </div>
                            </div>
                            {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                        </>
                    ) : (
                        paginatedDisplayResults.map((product, index) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                index={index}
                                onClick={handleProductClick}
                                onSelect={toggleCompare}
                                isSelected={compareList.includes(product.id)}
                            />
                        ))
                    )}
                </div>
                
                {!loading && displayResults.length > page * ITEMS_PER_PAGE && (
                    <div className="flex justify-center mt-16 mb-20">
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="px-8 py-4 bg-card border border-border hover:border-primary/50 rounded-2xl shadow-sm text-base font-semibold hover:bg-accent flex items-center gap-3 group"
                        >
                            Load More Results 
                        </button>
                    </div>
                )}
            </section>

            {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
            <ComparisonDrawer selectedIds={compareList} products={results} onRemove={(id) => setCompareList(coords => coords.filter(c => c !== id))} onClear={() => setCompareList([])} onCompare={() => setShowComparison(true)} />
            {showComparison && <ComparisonView products={results.filter(p => compareList.includes(p.id))} onClose={() => setShowComparison(false)} />}
        </div>
    );
}