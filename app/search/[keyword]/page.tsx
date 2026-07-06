// app/search/[keyword]/page.tsx
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { client } from '@/sanity/lib/client';

interface SearchPageProps {
  params: Promise<{ keyword: string }>;
}

// Cache the compiled HTML footprint at the edge for 24 hours
export const revalidate = 86400; 

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { keyword } = await params;
  const decodedKeyword = decodeURIComponent(keyword);

  return {
    title: `Best Lowest Price Per Unit ${decodedKeyword} | BudgetLynx`,
    description: `Compare optimized price-per-unit metrics and dynamic product options for ${decodedKeyword}.`,
    alternates: {
      canonical: `https://budgetlynx.com/search/${keyword}`,
    },
  };
}

export default async function ProgrammaticSearchPage({ params }: SearchPageProps) {
  const { keyword } = await params;
  const decodedKeyword = decodeURIComponent(keyword);
  
  // Pull pre-filtered dataset directly from your database
  const queryData = await client.fetch(
    `*[_type == "productQuery" && keywordSlug == $keyword][0] {
      keywordValue,
      products[] {
        id,
        title,
        price,
        unitInfo,
        pricePerUnit
      }
    }`, 
    { keyword }
  );

  // If the query configuration doesn't exist or holds no records, 
  // immediately throw a hard 404 header to prevent Search Console soft 404 traps.
  if (!queryData || !queryData.products || queryData.products.length === 0) {
    notFound(); 
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-zinc-100">
      <h1 className="text-2xl font-black font-mono text-rose-500 uppercase tracking-tight">
        // SEARCH OPTIMIZATION PATH: {queryData.keywordValue}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Render your pre-filtered high-quality item card collection here */}
      </div>
    </main>
  );
}