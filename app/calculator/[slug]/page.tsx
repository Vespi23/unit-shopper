// app/calculator/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { RETAILERS, BRAND_MAPPING, METRICS } from "@/lib/seo-matrix";
// Import your primary application search execution dashboard or component here
// import { SearchResultsEngine } from "@/components/SearchResultsEngine";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

function extractSearchTokens(slug: string) {
  const parts = slug.split("-");
  if (parts.length < 5 || parts[parts.length - 1] !== "calculator") return null;

  const retailer = parts[0];
  const brand = parts[1];
  
  if (!RETAILERS.includes(retailer) || !BRAND_MAPPING[brand]) return null;

  // Re-assemble the URL string into a clean search engine query text
  const category = parts.slice(2, parts.length - 3).join(" ");
  const cleanSearchQuery = `${retailer} ${brand} ${category}`.replace(/\b\w/g, c => c.toUpperCase());

  return {
    queryText: cleanSearchQuery,
    retailer,
    brand,
    category
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = extractSearchTokens(slug);
  if (!data) return {};

  return {
    title: `Find Bulk Deals on ${data.queryText} | BudgetLynx`,
    description: `Compare real unit values and cross-shop prices for ${data.queryText} instantly on BudgetLynx.`
  };
}

export default async function ProgrammaticSearchLandingPage({ params }: Props) {
  const { slug } = await params;
  const data = extractSearchTokens(slug);
  
  // If the path doesn't align with our matrix rules, send to safe fallback
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-background py-12 px-4 text-foreground">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border-b border-border pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Automated Price Search
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-1">
            {data.queryText}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Showing real-time bulk unit prices and value metrics compiled for this item.
          </p>
        </div>

        {/* FALLBACK WORKAROUND:
          Instead of rendering a calculator widget, we automatically pass the parsed URL
          tokens directly into your core product search component interface.
        */}
        <div className="bg-muted/30 border border-border rounded-2xl p-6">
          <p className="text-xs text-muted-foreground mb-4">
            Searching network inventory databases for: <strong className="text-foreground">"{data.queryText}"</strong>
          </p>
          
          {/* <SearchResultsEngine initialQuery={data.queryText} forcedRetailer={data.retailer} /> */}
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <p className="text-sm font-medium">Core Search Pipeline Integration Active</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Uncomment your SearchResultsEngine component block to display live unit price matches here.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}