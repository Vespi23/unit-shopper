'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, Loader2 } from 'lucide-react';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { ComparisonDrawer } from '@/components/ComparisonDrawer';
import { ComparisonView } from '@/components/ComparisonView';
import { track } from '@vercel/analytics';

export default function Home() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState<'score_asc' | 'price_asc' | 'price_desc'>('score_asc');
  const [filterSource, setFilterSource] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) {
        setDebouncedQuery(query);
      } else if (query.length === 0) {
        setResults([]);
        setSearched(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results
  useEffect(() => {
    async function fetchResults() {
      if (!debouncedQuery) return;

      setLoading(true);
      setSearched(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);

        // Track successful search
        if (Array.isArray(data) && data.length > 0) {
          track('search_query', { query: debouncedQuery, resultCount: data.length });
        }
      } catch (error) {
        console.error("Search failed", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [debouncedQuery]);

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

  // Filter and Sort Logic
  const uniqueSources = Array.from(new Set(results.map(p => p.source)));

  const filteredAndSortedResults = [...results]
    .filter(p => filterSource.length === 0 || filterSource.includes(p.source))
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return (a.score || 999999) - (b.score || 999999); // score_asc (Best Value)
    });

  const toggleSourceFilter = (source: string) => {
    setFilterSource(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  return (
    <div className="flex flex-col items-center w-full pb-20">
      {/* Hero Section */}
      <section className="w-full bg-gradient-to-b from-background to-muted/50 py-20 px-4 flex flex-col items-center text-center">
        {/* ... (existing hero content) ... */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
          More Bang For Your Buck
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-10">
          Stop overpaying. Compare unit prices instantly across Amazon and Walmart to find the real best deal.
        </p>

        {/* Search Input */}
        <div className="relative w-full max-w-xl group">
          {/* ... existing search input ... */}
          <div className={`absolute -inset-1 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-20 blur transition duration-500 group-hover:opacity-40 ${query ? 'opacity-40' : ''}`}></div>
          <div className="relative flex items-center bg-card rounded-xl border border-border shadow-sm p-2">
            <Search className="h-6 w-6 text-muted-foreground ml-3 mr-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for peanut butter, coffee, laundry detergent..."
              className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground/50 h-10 ring-0 focus:ring-0"
              autoFocus
            />
            {loading && <Loader2 className="h-5 w-5 animate-spin text-primary mr-3" />}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="container px-4 mt-8 w-full">
        {searched && !loading && results.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No results found for "{debouncedQuery}". Try "Peanut Butter" or "Coffee".
          </div>
        )}

        {/* Controls Section */}
        {results.length > 0 && !loading && (
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">

            {/* Source Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground mr-2">Filter:</span>
              {uniqueSources.map(source => (
                <button
                  key={source}
                  onClick={() => toggleSourceFilter(source)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterSource.includes(source)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                    }`}
                >
                  {source}
                </button>
              ))}
              {filterSource.length > 0 && (
                <button
                  onClick={() => setFilterSource([])}
                  className="text-xs text-muted-foreground hover:text-primary underline ml-2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="score_asc">Best Value (Unit Price)</option>
                <option value="price_asc">Lowest Total Price</option>
                <option value="price_desc">Highest Total Price</option>
              </select>
            </div>
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
