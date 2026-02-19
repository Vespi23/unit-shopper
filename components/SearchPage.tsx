'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, Loader2, Filter, X } from 'lucide-react';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { ComparisonDrawer } from '@/components/ComparisonDrawer';
import { ComparisonView } from '@/components/ComparisonView';
import { track } from '@vercel/analytics';
import { useRouter, useSearchParams } from 'next/navigation';

import { FeaturesSection } from '@/components/FeaturesSection';
import { TrendingCategories } from '@/components/TrendingCategories';
import { convertValue, calculatePricePerUnit, UnitType } from '@/lib/unit-parser';

interface SearchPageProps {
    initialResults?: Product[];
}

export function SearchPage({ initialResults = [] }: SearchPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL
    const initialQuery = searchParams.get('q') || '';

    const [query, setQuery] = useState(initialQuery);
    const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
    const [results, setResults] = useState<Product[]>(initialResults);
    const [sortBy, setSortBy] = useState<'score_asc' | 'price_asc' | 'price_desc'>('score_asc');
    const [selectedUnit, setSelectedUnit] = useState<UnitType | 'auto'>('auto');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(!!initialQuery);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [compareList, setCompareList] = useState<string[]>([]);
    const [showComparison, setShowComparison] = useState(false);
    const [disabledUnits, setDisabledUnits] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Track if we have already used the initial data
    const initialRenderRef = useRef(true);

    // Track if we successfully loaded `initialResults` for the current query
    const lastInitialResultsQuery = useRef<string | null>(null);

    // Sync results from Server if they change (e.g. navigation)
    useEffect(() => {
        if (initialResults && initialResults.length > 0) {
            console.log("Applying initialResults from server");
            setResults(initialResults);
            setSearched(true);
            setLoading(false);
            setPage(1);
            lastInitialResultsQuery.current = new URLSearchParams(window.location.search).get('q');
        }
    }, [initialResults]);

    // Sync URL when query changes (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query !== searchParams.get('q')) {
                const params = new URLSearchParams(searchParams.toString());
                if (query) {
                    params.set('q', query);
                } else {
                    params.delete('q');
                }
                router.push(`/?${params.toString()}`, { scroll: false });
            }

            if (query.length > 2) {
                setDebouncedQuery(query);
                setPage(1);
            } else if (query.length === 0) {
                setResults([]);
                setSearched(false);
                setPage(1);
                setDebouncedQuery('');
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query, router, searchParams]);

    useEffect(() => {
        setDisabledUnits(new Set());
    }, [debouncedQuery, selectedUnit]);

    // Fetch results
    useEffect(() => {
        async function fetchResults() {
            if (!debouncedQuery) return;

            if (lastInitialResultsQuery.current === debouncedQuery && page === 1) {
                console.log("Skipping client fetch, using initialResults");
                return;
            }

            setLoading(true);
            setSearched(true);
            try {
                console.log(`Fetching client results for: ${debouncedQuery}`);
                const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&page=${page}`);
                const data = await res.json();

                const newResults = Array.isArray(data) ? data : [];

                if (newResults.length === 0) {
                    setHasMore(false);
                }

                setResults(prev => {
                    const combined = page === 1 ? newResults : [...prev, ...newResults];
                    const uniqueMap = new Map();
                    combined.forEach(item => {
                        if (!uniqueMap.has(item.id)) {
                            uniqueMap.set(item.id, item);
                        }
                    });
                    return Array.from(uniqueMap.values());
                });

            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setLoading(false);
            }
        }

        fetchResults();
    }, [debouncedQuery, page]);

    const toggleCompare = (productId: string, selected: boolean) => {
        if (selected) {
            if (compareList.length < 4) {
                setCompareList([...compareList, productId]);
            } else {
                alert("You can compare up to 4 products.");
            }
        } else {
            setCompareList(compareList.filter(id => id !== productId));
        }
    };

    // Sort Logic (Memoized)
    const filteredAndSortedResults = useMemo(() => {
        return [...results]
            .filter((product, index, self) =>
                index === self.findIndex((t) => (
                    t.id === product.id
                ))
            )
            .sort((a, b) => {
                if (sortBy === 'price_asc') return a.price - b.price;
                if (sortBy === 'price_desc') return b.price - a.price;
                return (a.score || 999999) - (b.score || 999999);
            });
    }, [results, sortBy]);

    // Apply Unit Conversion (Memoized)
    const convertedResults = useMemo(() => {
        return filteredAndSortedResults.map(product => {
            if (selectedUnit === 'auto' || !product.unitInfo) return product;

            const convertedAmount = convertValue(product.unitInfo.totalValue, product.unitInfo.unit as UnitType, selectedUnit as UnitType);

            if (convertedAmount !== null) {
                return {
                    ...product,
                    pricePerUnit: calculatePricePerUnit(product.price, convertedAmount, selectedUnit as string),
                    unitInfo: {
                        ...product.unitInfo,
                        formatted: `${convertedAmount.toFixed(2)} ${selectedUnit}`
                    }
                };
            }
            return product;
        });
    }, [filteredAndSortedResults, selectedUnit]);

    // Extract Available Units (Memoized)
    const availableUnits = useMemo(() => {
        const units = Array.from(new Set(convertedResults.map(p => p.unitInfo?.unit).filter(Boolean))) as string[];
        return units.sort();
    }, [convertedResults]);

    // Filter by Disabled Units (Memoized)
    const displayResults = useMemo(() => {
        return convertedResults.filter(product => {
            return !product.unitInfo?.unit || !disabledUnits.has(product.unitInfo.unit);
        });
    }, [convertedResults, disabledUnits]);

    return (
        <div className="flex flex-col items-center w-full pb-20">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "BudgetLynx",
                        "url": "https://www.budgetlynx.com",
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": "https://www.budgetlynx.com/?q={search_term_string}",
                            "query-input": "required name=search_term_string"
                        }
                    }).replace(/</g, '\\u003c')
                }}
            />
            {/* Hero Section */}
            <section className="w-full bg-gradient-to-b from-emerald-50/50 via-background to-background pt-24 pb-4 px-4 flex flex-col items-center text-center">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 mb-6 uppercase tracking-wider shadow-sm">
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
                    <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 opacity-20 blur-xl transition duration-500 group-hover:opacity-40 ${query ? 'opacity-50' : ''}`}></div>
                    <div className="relative flex items-center bg-card rounded-2xl border border-border/50 shadow-lg shadow-emerald-900/5 p-2 transition-shadow duration-300 focus-within:shadow-xl focus-within:shadow-emerald-900/10">
                        <Search className="h-6 w-6 text-muted-foreground ml-4 mr-3" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for peanut butter, laundry detergent..."
                            className="flex-1 bg-transparent border-none outline-none text-xl placeholder:text-muted-foreground/40 h-12 ring-0 focus:ring-0"
                            autoFocus
                            aria-label="Search products"
                        />
                        {loading && <Loader2 className="h-6 w-6 animate-spin text-primary mr-4" />}
                    </div>
                </div>

                {/* Trending Categories (Only show if not searching) */}
                {!searched && (
                    <TrendingCategories onSelect={(q) => setQuery(q)} />
                )}
            </section>

            {/* Features Section (Only show if not searching) */}
            {!searched && (
                <FeaturesSection />
            )}

            {/* Results Section */}
            <section className="container px-4 mt-4 w-full max-w-7xl">
                {searched && !loading && results.length === 0 && (
                    <div className="text-center py-24">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                            <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">No results found</h3>
                        <p className="text-muted-foreground">Try searching for generic terms like "Coffee" or "Paper Towels".</p>
                    </div>
                )}

                {/* Controls Section */}
                {results.length > 0 && !loading && (
                    <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
                        <div className="text-sm text-muted-foreground font-medium">
                            Found {results.length} results for <span className="text-foreground">"{debouncedQuery}"</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-3">
                                <label htmlFor="sort-select" className="text-sm font-medium text-muted-foreground">Sort by:</label>
                                <div className="relative">
                                    <select
                                        id="sort-select"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="appearance-none h-10 pl-4 pr-10 rounded-full border border-border bg-card text-sm font-medium shadow-sm transition-all hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                                        aria-label="Sort products"
                                    >
                                        <option value="score_asc">Best Value</option>
                                        <option value="price_asc">Lowest Price</option>
                                        <option value="price_desc">Highest Price</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Unit Filter Chips */}
                {loading && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8 -mt-4 p-4 bg-muted/30 rounded-2xl border border-border/40 animate-pulse">
                        <div className="h-4 w-24 bg-muted-foreground/20 rounded"></div>
                        <div className="flex gap-2">
                            <div className="h-8 w-20 bg-muted-foreground/20 rounded-full"></div>
                            <div className="h-8 w-24 bg-muted-foreground/20 rounded-full"></div>
                            <div className="h-8 w-16 bg-muted-foreground/20 rounded-full"></div>
                        </div>
                    </div>
                )}

                {!loading && results.length > 0 && availableUnits.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8 -mt-4 p-4 bg-muted/30 rounded-2xl border border-border/40">
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
                                        className={`
                                            group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border select-none
                                            ${isActive
                                                ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90'
                                                : 'bg-background text-muted-foreground border-border hover:border-border/80 hover:bg-accent'
                                            }
                                        `}
                                    >
                                        {unit}
                                        {isActive && <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />}
                                    </button>
                                );
                            })}
                            {disabledUnits.size > 0 && (
                                <button
                                    onClick={() => setDisabledUnits(new Set())}
                                    className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 ml-2 transition-colors"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Amazon Compliance Disclaimer */}
                {results.length > 0 && (
                    <div className="w-full text-center mb-6">
                        <p className="text-xs text-muted-foreground">
                            As an Amazon Associate I earn from qualifying purchases.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {loading && page === 1 ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <ProductCardSkeleton key={i} />
                        ))
                    ) : (
                        <>
                            {displayResults.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onClick={() => setSelectedProduct(product)}
                                    onSelect={(selected) => toggleCompare(product.id, selected)}
                                    isSelected={compareList.includes(product.id)}
                                />
                            ))}
                            {loading && (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <ProductCardSkeleton key={`skeleton-${i}`} />
                                ))
                            )}
                        </>
                    )}
                </div>

                {/* Load More Button */}
                {results.length > 0 && hasMore && (
                    <div className="flex justify-center mt-16 mb-20">
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={loading}
                            className="px-8 py-4 bg-card border border-border hover:border-primary/50 rounded-2xl shadow-sm text-base font-semibold transition-all hover:bg-accent disabled:opacity-50 flex items-center gap-3 group"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : null}
                            {loading ? 'Loading...' : <>Load More Results <div className="bg-muted group-hover:bg-primary/20 p-1 rounded-md transition-colors"><svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotate-180 group-hover:text-primary transition-colors"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div></>}
                        </button>
                    </div>
                )}
            </section>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            )}

            {/* Comparison Drawer */}
            <ComparisonDrawer
                selectedIds={compareList}
                products={results} // We pass results so the drawer can find title/image from ID
                onRemove={(id) => setCompareList(coords => coords.filter(c => c !== id))}
                onClear={() => setCompareList([])}
                onCompare={() => setShowComparison(true)}
            />

            {/* Comparison View Modal */}
            {showComparison && (
                <ComparisonView
                    products={results.filter(p => compareList.includes(p.id))}
                    onClose={() => setShowComparison(false)}
                />
            )}
        </div>
    );
}
