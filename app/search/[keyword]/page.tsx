// app/search/[keyword]/page.tsx
import { SearchPage } from '@/components/SearchPage';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{ keyword: string }>;
}

// Forces live edge computation to match fresh database additions instantly
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const rawKeyword = resolvedParams.keyword || '';
  
  // Format the URL slug into a readable, capitalized title for search rankings
  const cleanKeyword = decodeURIComponent(rawKeyword)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    title: `Best Lowest Price Per Unit ${cleanKeyword} | BudgetLynx`,
    description: `Compare optimized price-per-unit metrics and live product options for ${cleanKeyword}.`,
    alternates: {
      canonical: `https://budgetlynx.com/search/${rawKeyword}`,
    },
  };
}

export default async function ProgrammaticSearchPage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawKeyword = resolvedParams.keyword || '';
  
  // Convert the hyphenated URL parameter path back into a standard text search string
  const cleanQueryString = decodeURIComponent(rawKeyword).replace(/-/g, ' ');

  return (
    <div className="w-full min-h-screen bg-background">
      {/* 
        We use a clear Next.js key strategy to force a fresh client component 
        render instance whenever the URL parameter path shifts.
      */}
      <SearchPage key={rawKeyword} initialResults={[]} />
      
      {/* 
        CRITICAL SEO FALLBACK FOR CRAWLERS:
        We inject an invisible, machine-readable text asset block at the bottom of the DOM. 
        If a search crawler processes the page before your client-side JavaScript finishes fetching data, 
        it still indexes a unique, high-density keyword signature profile.
      */}
      <div className="sr-only hidden" aria-hidden="true">
        <h2>Programmatic Index Report for {cleanQueryString}</h2>
        <p>
          Analyzing real-time consumer retail supply metrics and pricing arrays tailored specifically for {cleanQueryString} searches on BudgetLynx.
        </p>
      </div>
    </div>
  );
}