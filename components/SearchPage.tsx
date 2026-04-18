'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, Loader2 } from 'lucide-react';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { ComparisonDrawer } from '@/components/ComparisonDrawer';
import { ComparisonView } from '@/components/ComparisonView';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { convertValue, calculatePricePerUnit } from '@/lib/unit-parser';

interface SearchPageProps {
    initialResults?: Product[];
}

const ITEMS_PER_PAGE = 40;

export function SearchPage({ initialResults = [] }: SearchPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialQuery = searchParams.get('q') || '';
    const initialUnit = searchParams.get('u') || '';
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
    const [disabledUnits, setDisabledUnits] = useState<Set<string>>(new Set());
    
    const [page, setPage] = useState(1);
    const lastInitialResultsQuery = useRef<string | null>(null);

    useEffect(() => {
        const q = searchParams.get('q') || '';
        const u = searchParams.get('u') || '';
        if (q !== submittedQuery) setSubmittedQuery(q);
        if (u !== selectedUnit) setSelectedUnit(u);
    }, [searchParams, submittedQuery, selectedUnit]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newQuery = (formData.get('searchQuery') as string).trim();

        const params = new URLSearchParams(searchParams.toString());
        if (newQuery) params.set('q', newQuery); else params.delete('q');
        if (selectedUnit) params.set('u', selectedUnit);

        router.push(`/?${params.toString()}`, { scroll: false });
        setSubmittedQuery(newQuery);
        setPage(1);
    };

    const handleUnitChange = (unit: string) => {
        setSelectedUnit(unit);
        const params = new URLSearchParams(searchParams.toString());
        if (unit) params.set('u', unit); else params.delete('u');
        router.push(`/?${params.toString()}`, { scroll: false });
    };

    useEffect(() => {
        async function fetchResults() {
            if (!submittedQuery) return;
            if (initialResults.length > 0 && lastInitialResultsQuery.current === submittedQuery && !selectedUnit) return;

            setLoading(true);
            setSearched(true);
            try {
                const unitParam = selectedUnit ? `&u=${encodeURIComponent(selectedUnit)}` : '';
                const res = await fetch(`/api/search?q=${encodeURIComponent(submittedQuery)}${unitParam}`);
                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
                setPage(1);
                lastInitialResultsQuery.current = submittedQuery;
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setLoading(false);
            }
        }
        fetchResults();
    }, [submittedQuery, selectedUnit, initialResults]);

    const convertedResults = useMemo(() => {
        return results.map(product => {
            if (!selectedUnit || !product.unitInfo) return product;
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
        const units = Array.from(new Set(results.map(p => p.unitInfo?.unit).filter(Boolean))) as string[];
        return units.sort();
    }, [results]);

    const sortedAndConvertedResults = useMemo(() => {
        return [...convertedResults].sort((a, b) => {
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            return (a.score ?? 999999) - (b.score ?? 999999);
        });
    }, [convertedResults, sortBy]);

    const paginatedDisplayResults = useMemo(() => {
        return sortedAndConvertedResults
            .filter(p => !p.unitInfo?.unit || !disabledUnits.has(p.unitInfo.unit))
            .slice(0, page * ITEMS_PER_PAGE);
    }, [sortedAndConvertedResults, disabledUnits, page]);

    return (
        <div className={`flex flex-col items-center w-full pb-20 ${isExtension ? 'bg-background pt-4' : ''}`}>
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
                                <Loader2 className="h-6 w-6 animate-spin text-primary mr-4" />
                            ) : (
                                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/10">
                                    Search
                                </button>
                            )}
                        </form>

                        {/* LYNX VISION EXTENSION PROMO */}
                        <div className="mt-8 hidden sm:block animate-in fade-in zoom-in duration-700 delay-300">
                            <div className="glass dark:glass-dark rounded-2xl border border-primary/20 p-4 flex items-center justify-between gap-6 shadow-xl lynx-glow">
                                <div className="flex items-center gap-4">
                                    <div className="relative h-10 w-10 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-sm border overflow-hidden">
                                        <Image src="/logo.png" alt="Lynx Vision Logo" width={32} height={32} className="object-contain" />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-foreground">Lynx Vision</p>
                                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Verified</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-none mt-1">
                                            Automatic unit price comparisons while you shop on Amazon.
                                        </p>
                                    </div>
                                </div>
                                <a 
                                    href="https://chromewebstore.google.com/detail/lynx-vision/eoihkpljhmakhpecnobkcnjofidebmhl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95 shadow-md"
                                >
                                    Install Free
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <section className="container px-4 mt-4 w-full max-w-7xl min-h-[60vh]">
                {searched && results.length > 0 && (
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
                                            {availableUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                                        </optgroup>
                                    )}
                                    <optgroup label="Generalize Weights">
                                        <option value="oz">Ounces (oz)</option>
                                        <option value="lb">Pounds (lb)</option>
                                        <option value="g">Grams (g)</option>
                                    </optgroup>
                                    <optgroup label="Generalize Volume">
                                        <option value="fl oz">Fluid Oz (fl oz)</option>
                                        <option value="gal">Gallons (gal)</option>
                                        <option value="ml">Milliliters (ml)</option>
                                    </optgroup>
                                    <optgroup label="Generalize Household">
                                        <option value="count">Each (ea)</option>
                                        <option value="rolls">Rolls</option>
                                        <option value="sheets">Sheets</option>
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
                            <ProductCard
                                key={product.id}
                                product={product}
                                index={index}
                                onClick={(p) => setSelectedProduct(p)}
                                onSelect={(id, sel) => setCompareList(prev => sel ? [...prev, id] : prev.filter(i => i !== id))}
                                isSelected={compareList.includes(product.id)}
                            />
                        ))
                    )}
                </div>
            </section>

            {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
            <ComparisonDrawer selectedIds={compareList} products={results} onRemove={(id) => setCompareList(p => p.filter(i => i !== id))} onClear={() => setCompareList([])} onCompare={() => setShowComparison(true)} />
            {showComparison && <ComparisonView products={results.filter(p => compareList.includes(p.id))} onClose={() => setShowComparison(false)} />}
        </div>
    );
}