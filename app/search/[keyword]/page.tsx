// app/search/[keyword]/page.tsx
import { SearchPage } from '@/components/SearchPage';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{ keyword: string }>;
}

export const dynamic = 'force-dynamic';

// Array of exact modifier phrase patterns used in your ingestion script
const modifiersToStrip = [
  "price per pound", "cost per ounce", "bulk wholesale price", "best price per unit",
  "lowest price per count", "value pack pricing", "price breakdown", "cost comparison",
  "wholesale per ounce", "bulk buy metrics", "amazon price per count", "unit value matrix",
  "cheapest per lb", "case price analysis", "size cost efficiency", "pack distribution value",
  "per item baseline", "economical bulk size", "smart shopper cost", "volume discount tier",
  "price verification", "retail unit index", "net weight cost", "oz cost optimization",
  "fluid ounce breakdown", "for bulk", "pack of", "bulk"
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const rawKeyword = resolvedParams.keyword || '';
  const cleanKeyword = decodeURIComponent(rawKeyword).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return {
    title: `Best Lowest Price Per Unit ${cleanKeyword} | BudgetLynx`,
    description: `Compare optimized price-per-unit metrics and live product choices for ${cleanKeyword}.`,
    alternates: { canonical: `https://budgetlynx.com/search/${rawKeyword}` },
  };
}

export default async function ProgrammaticSearchPage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawKeyword = resolvedParams.keyword || '';
  
  // Convert slug to standard space-separated phrase text string
  const fullSEOPhrase = decodeURIComponent(rawKeyword).replace(/-/g, ' ').toLowerCase();

  // Clean the text by filtering out your target search modifiers
  let cleanSearchQuery = fullSEOPhrase;
  for (const modifier of modifiersToStrip) {
    const regex = new RegExp(`\\b${modifier}\\b`, 'gi');
    cleanSearchQuery = cleanSearchQuery.replace(regex, '');
  }

  // Clean up any remaining extra white spaces or hanging numeric patterns
  cleanSearchQuery = cleanSearchQuery.replace(/\b\d+\b/g, '').replace(/\s+/g, ' ').trim();

  // Fallback safety gate: if the string is empty, preserve the original phrase
  if (!cleanSearchQuery) {
    cleanSearchQuery = fullSEOPhrase;
  }

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Pass the stripped query string directly to your component interface */}
      <SearchPage key={rawKeyword} initialQuery={cleanSearchQuery} initialResults={[]} />
      
      <div className="sr-only hidden" aria-hidden="true">
        <h2>Programmatic Optimization Index for {fullSEOPhrase}</h2>
        <p>Evaluating consumer retail pricing metrics for {cleanSearchQuery}.</p>
      </div>
    </div>
  );
}