'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/types';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { Search, Loader2 } from 'lucide-react';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { ComparisonDrawer } from '@/components/ComparisonDrawer';
import { ComparisonView } from '@/components/ComparisonView';

export default function Home() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
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
        setResults(data.results || []);
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          ) : (
            results.map((product) => (
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
