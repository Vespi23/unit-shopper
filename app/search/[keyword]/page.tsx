// app/search/[keyword]/page.tsx
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { client } from '@/sanity/lib/client';
import { SearchPage } from '@/components/SearchPage';

interface SearchPageProps {
  params: Promise<{ keyword: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { keyword } = await params;
  const decodedKeyword = decodeURIComponent(keyword).replace(/-/g, ' ');

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
  
  // 1. Verify that this slug belongs to a real ingested pSEO keyword asset row
  const queryData = await client.fetch(
    `*[_type in ["productQuery", "pSeoKeyword"] && (keywordSlug == $keyword || slug.current == $keyword)][0] {
      "keywordValue": coalesce(keywordValue, slug.current)
    }`,
    { keyword }
  );

  // Hard fail to 404 only if the keyword hasn't been created by your scraper tool
  if (!queryData || !queryData.keywordValue) {
    notFound();
  }

  // 2. Fetch all products matching this keyword phrase to pre-populate the page server-side
  const cleanSearchTerm = queryData.keywordValue.trim();
  let preHydratedProducts = [];
  
  try {
    preHydratedProducts = await client.fetch(
      `*[_type == "product" && (title match $searchQuery || description match $searchQuery)][0...40] {
        id,
        title,
        price,
        unitInfo,
        pricePerUnit,
        image,
        stars,
        reviews
      }`,
      { searchQuery: `*${cleanSearchTerm}*` }
    );
  } catch (error) {
    console.error('[PSEO_LIVE_PROD_FETCH_ERROR]:', error);
  }

  // 3. Render your full-featured SearchPage component pre-populated with your data
  return (
    <div className="w-full pt-6 bg-background min-h-screen">
      <SearchPage initialResults={preHydratedProducts} />
    </div>
  );
}