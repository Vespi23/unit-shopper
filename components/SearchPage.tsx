'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, AlertCircle, Layers, X, Loader2, Info } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    parseUnit,
    normalizeUnit,
    convertValue, 
    calculatePricePerUnit, 
    toCanonicalUnit 
} from '@/lib/unit-parser';

type EnhancedSortingProduct = Product & {
    pricePerUnitNumeric?: number;
    totalPriceNumeric?: number;
    ppuFormatted?: string;
    parsedUnitInfo?: any;
    [key: string]: any;
};

interface SearchPageProps {
    initialResults?: EnhancedSortingProduct[];
    initialQuery?: string;
}

const ITEMS_PER_PAGE = 40;

export function SearchPage({ initialResults = [], initialQuery = '' }: SearchPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const urlQueryParam = searchParams.get('q') || initialQuery;
    const isExtension = searchParams.get('utm_source') === 'chrome_extension';
    
    const [results, setResults] = useState<EnhancedSortingProduct[]>(initialResults);
    const [sortBy, setSortBy] = useState<'ppu' | 'price_asc' | 'price_desc'>('ppu');
    const [selectedUnit, setSelectedUnit] = useState<string>(searchParams.get('u') || '');
    
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(initialResults.length > 0 || !!urlQueryParam);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [compareList, setCompareList] = useState<string[]>([]);
    const [pageLimit, setPageLimit] = useState<number>(1);

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
        setPageLimit(1);
        
        const params = new URLSearchParams(searchParams.toString());
        params.set('q', newQuery);
        router.push(`/?${params.toString()}`, { scroll: false });
    };

    const handleUnitChange = (unit: string) => {
        setSelectedUnit(unit);
    };

    useEffect(() => {
        if (!urlQueryParam) { 
            setResults([]); 
            setSearched(false); 
            setLoading(false); 
            return; 
        }

        if (initialResults && initialResults.length > 0) return;

        setLoading(true);
        fetch(`/api/search?q=${encodeURIComponent(urlQueryParam)}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => { 
                setResults(data); 
                setSearched(true); 
            })
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, [urlQueryParam, initialResults]); 

    const detectedAvailableUnits = useMemo(() => {
        const units = results.map(p => {
            const info = parseUnit(p.title);
            if (info && info.unit !== 'unknown') {
                return toCanonicalUnit(info.unit);
            }
            return toCanonicalUnit(p.unit ?? 'count');
        }).filter(u => u !== 'unknown') as string[];

        return Array.from(new Set(units)).sort();
    }, [results]);

    const displayData = useMemo(() => {
        let processed = results.map(product => {
            const unitInfo = parseUnit(product.title);
            const normalized = unitInfo ? normalizeUnit(unitInfo) : null;
            const baseAmount = normalized?.totalValue ?? product.totalAmount ?? product.amount ?? 1;
            const currentUnitType = normalized?.unit ?? toCanonicalUnit(product.unit ?? 'count');
            
            if (!selectedUnit || selectedUnit === 'unknown') {
                const defaultPpu = unitInfo ? calculatePricePerUnit(product.price, normalized?.totalValue ?? 1, normalized?.unit ?? 'count') : (product.score ?? product.price);
                return { 
                    ...product, 
                    pricePerUnitNumeric: product.score ?? product.price, 
                    totalPriceNumeric: product.price,
                    ppuFormatted: typeof defaultPpu === 'string' ? defaultPpu : `$${product.price.toFixed(2)}/ea`,
                    parsedUnitInfo: unitInfo
                };
            }

            const convertedAmount = convertValue(baseAmount, currentUnitType, selectedUnit, product.title);
            const ppu = convertedAmount && convertedAmount > 0 ? (product.price / convertedAmount) : 999999;
            const formattedPpu = convertedAmount && convertedAmount > 0 ? calculatePricePerUnit(product.price, convertedAmount, selectedUnit) : 'Incompatible';

            return { 
                ...product, 
                pricePerUnitNumeric: convertedAmount && convertedAmount > 0 ? ppu : 999999, 
                totalPriceNumeric: product.price,
                ppuFormatted: formattedPpu,
                parsedUnitInfo: unitInfo
            };
        });

        processed.sort((a, b) => {
            if (sortBy === 'price_asc') return (a.totalPriceNumeric ?? 0) - (b.totalPriceNumeric ?? 0);
            if (sortBy === 'price_desc') return (b.totalPriceNumeric ?? 0) - (a.totalPriceNumeric ?? 0);
            return (a.pricePerUnitNumeric ?? 999999) - (b.pricePerUnitNumeric ?? 999999);
        });

        return processed.slice(0, pageLimit * ITEMS_PER_PAGE);
    }, [results, selectedUnit, sortBy, pageLimit]);

    const hasMore = results.length > pageLimit * ITEMS_PER_PAGE;

    return (
        <div className={`flex flex-col items-center w-full pb-32 ${isExtension ? 'bg-background pt-4' : ''}`}>
            
            {/* DEEP SCRAPING LOADING OVERLAY */}
            {loading && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                    <div className="bg-card border border-border p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center space-y-6">
                        <Loader2 className="h-14 w-14 text-emerald-500 animate-spin" />
                        <div className="space-y-2">
                            <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                                Deep Scraping...
                            </h2>
                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                                Please stay on this page. This will take a moment.
                            </p>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-full animate-pulse"></div>
                        </div>
                    </div>
                </div>
            )}

            {!isExtension && (
                <section className="w-full pt-24 md:pt-32 pb-16 md:pb-20 px-4 flex flex-col items-center text-center bg-gradient-to-b from-emerald-50/50 via-background to-background">
                    <h1 className="text-4xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 md:mb-8 text-foreground">
                        Shop by <span className="text-emerald-600">True Value</span>.
                    </h1>
                    
                    <div className="relative w-full max-w-3xl z-10 px-2">
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center bg-card shadow-2xl rounded-3xl border border-border p-2 sm:p-3 gap-2">
                            <div className="flex items-center w-full sm:flex-1 pl-2">
                                <Search className="h-6 w-6 text-muted-foreground ml-2 shrink-0" />
                                <input 
                                    name="searchQuery" 
                                    defaultValue={urlQueryParam} 
                                    placeholder="Search products across Amazon & Walmart..." 
                                    className="w-full bg-transparent p-3 md:p-4 text-base md:text-xl outline-none text-foreground placeholder:text-muted-foreground" 
                                />
                            </div>
                            <button type="submit" className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold text-base md:text-lg hover:bg-emerald-700 transition-all shrink-0">
                                Search
                            </button>
                        </form>
                    </div>
                </section>
            )}

            <section className="container px-4 sm:px-6 mt-6 md:mt-8 w-full max-w-7xl">
                {searched && !loading && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-bold text-foreground">No results found</h2>
                        <p className="text-muted-foreground mt-2">Try adjusting your search terms or broadening keywords.</p>
                    </div>
                )}

                {searched && !loading && results.length > 0 && (
                    <>
                        {/* SAFETY & MATH DISCLAIMER */}
                        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
                            <Info className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <p className="leading-relaxed">
                                <span className="font-bold">Disclaimer:</span> Our math is based on product titles. We can make mistakes so please double check for your safety.
                            </p>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-4 mb-8 items-start lg:items-center justify-between">
                            <p className="text-base sm:text-lg text-muted-foreground font-medium">
                                Found <span className="font-bold text-foreground">{results.length}</span> verified items for <span className="font-bold text-foreground">"{urlQueryParam}"</span>
                            </p>
                            <div className="flex gap-3 flex-wrap w-full lg:w-auto">
                                <select 
                                    value={selectedUnit} 
                                    onChange={(e) => handleUnitChange(e.target.value)} 
                                    className="flex-1 sm:flex-none px-4 sm:px-5 py-3 rounded-2xl sm:rounded-full border border-border bg-card font-semibold text-sm outline-none cursor-pointer hover:bg-accent text-foreground transition-colors"
                                >
                                    <option value="">Original Units</option>
                                    {detectedAvailableUnits.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                                </select>
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value as any)} 
                                    className="flex-1 sm:flex-none px-4 sm:px-5 py-3 rounded-2xl sm:rounded-full border border-border bg-card font-semibold text-sm outline-none cursor-pointer hover:bg-accent text-foreground transition-colors"
                                >
                                    <option value="ppu">Best Unit Value</option>
                                    <option value="price_asc">Lowest Total Price</option>
                                    <option value="price_desc">Highest Total Price</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
                            {displayData.map((p, i) => (
                                <ProductCard 
                                    key={`${p.id}-${selectedUnit}-${sortBy}-${i}`} 
                                    product={{
                                        ...p,
                                        pricePerUnit: p.ppuFormatted || p.pricePerUnit
                                    } as any} 
                                    index={i}
                                    onClick={setSelectedProduct}
                                    onSelect={(id, sel) => setCompareList(prev => sel ? [...prev, id] : prev.filter(item => item !== id))}
                                    isSelected={compareList.includes(p.id)}
                                />
                            ))}
                        </div>

                        {hasMore && (
                            <div className="flex justify-center mt-12">
                                <button 
                                    onClick={() => setPageLimit(prev => prev + 1)}
                                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/85 transition-all shadow-sm"
                                >
                                    Load More Results ({results.length - displayData.length} remaining)
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Comparison Floating Drawer */}
            {compareList.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl shadow-2xl flex items-center justify-between sm:justify-start gap-4 sm:gap-6 w-[92%] sm:w-auto animate-in fade-in slide-in-from-bottom-6">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm truncate">
                        <Layers className="h-5 w-5 text-emerald-400 shrink-0" />
                        <span className="truncate">{compareList.length} items selected</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <button 
                            onClick={() => alert(`Comparing products: ${compareList.join(', ')}`)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                        >
                            Compare Value
                        </button>
                        <button 
                            onClick={() => setCompareList([])}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-background/70 hover:text-background"
                            title="Clear selection"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}