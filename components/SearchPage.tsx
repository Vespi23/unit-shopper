'use client';

import { useState, useEffect, useRef } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, Loader2 } from 'lucide-react';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { ComparisonDrawer } from '@/components/ComparisonDrawer';
import { ComparisonView } from '@/components/ComparisonView';
import { track } from '@vercel/analytics';
import { useRouter, useSearchParams } from 'next/navigation';

import { FeaturesSection } from '@/components/FeaturesSection';
import { TrendingCategories } from '@/components/TrendingCategories';

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
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(!!initialQuery);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [compareList, setCompareList] = useState<string[]>([]);
    const [showComparison, setShowComparison] = useState(false);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Track if we have already used the initial data
    const initialRenderRef = useRef(true);

    // Sync URL when query changes (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            // Update URL
            if (query !== searchParams.get('q')) {
                const params = new URLSearchParams(searchParams.toString());
                if (query) {
                    params.set('q', query);
                } else {
                    params.delete('q');
                }
                router.push(`/?${params.toString()}`, { scroll: false });
            }

            // Update Internal State
            if (query.length > 2) {
                setDebouncedQuery(query);
                setPage(1);
                // Only clear results if it's NOT the initial render with valid data
                // Actually, if query changes, we ALWAYS want to clear.
                // The initial render case is handled by useState(initialResults) and the fetch effect guard.
                if (!initialRenderRef.current) {
                    setResults([]);
                    setHasMore(true);
                }
            } else if (query.length === 0) {
                setResults([]);
                setSearched(false);
                setPage(1);
                setDebouncedQuery('');
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query, router, searchParams]);

    // Fetch results
    useEffect(() => {
        async function fetchResults() {
            if (!debouncedQuery) return;

            // Guard: If this is the first run, and we have initial results, and the query matches...
            // We skip the fetch to use the Hydrated data.
            if (initialRenderRef.current && initialResults.length > 0 && debouncedQuery === initialQuery) {
                initialRenderRef.current = false;
                return;
            }

            // If we are past first render, update ref
            initialRenderRef.current = false;

            setLoading(true);
            setSearched(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&page=${page}`);
                const data = await res.json();

                const newResults = Array.isArray(data) ? data : [];

                if (newResults.length === 0) {
                    setHasMore(false);
                }

                setResults(prev => page === 1 ? newResults : [...prev, ...newResults]);

                // Track successful search
                if (page === 1 && newResults.length > 0) {
                    track('search_query', { query: debouncedQuery, resultCount: newResults.length });
                }
            } catch (error) {
                console.error("Search failed", error);
                if (page === 1) setResults([]);
            } finally {
                setLoading(false);
            }
        }

        fetchResults();
    }, [debouncedQuery, page, initialQuery, initialResults.length]);

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

    // Sort Logic
    const filteredAndSortedResults = [...results]
        .sort((a, b) => {
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            return (a.score || 999999) - (b.score || 999999); // score_asc (Best Value)
        });

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
                        />
                        {loading && <Loader2 className="h-6 w-6 animate-spin text-primary mr-4" />}
                    </div>
                </div>

                {/* Trending Categories (Only show if not searching) */}
                {!searched && !query && (
                    <TrendingCategories onSelect={(q) => setQuery(q)} />
                )}
            </section>

            {/* Features Section (Only show if not searching) */}
            {!searched && !query && (
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

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="appearance-none h-10 pl-4 pr-10 rounded-lg border border-input bg-card text-sm font-medium shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                                >
                                    <option value="score_asc">Best Value (Lowest Unit Price)</option>
                                    <option value="price_asc">Lowest Total Price</option>
                                    <option value="price_desc">Highest Total Price</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
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
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <ProductCardSkeleton key={i} />
                        ))
                    ) : (
                        filteredAndSortedResults.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onClick={() => setSelectedProduct(product)}
                                onSelect={(selected) => toggleCompare(product.id, selected)}
                                isSelected={compareList.includes(product.id)}
                            />
                        ))
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
