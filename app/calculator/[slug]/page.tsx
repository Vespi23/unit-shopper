// app/calculator/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import CalculatorWidget from "./CalculatorWidget";

interface Props {
  params: Promise<{ slug: string }>;
}

// Low-overhead dictionary matrices used to calculate dynamic text copy variants on the fly
const RETAILERS: Record<string, string> = {
  amazon: "Amazon", walmart: "Walmart", costco: "Costco", "sams-club": "Sam's Club", target: "Target", bjs: "BJ's Wholesale"
};

const METRICS: Record<string, { label: string; unitA: string; unitB: string; ratio: number; formula: string }> = {
  "cost-per-ounce": { label: "Cost per Ounce", unitA: "Ounces (oz)", unitB: "Pounds (lbs)", ratio: 16, formula: "Price per Lb = Price per Oz × 16" },
  "price-per-sheet": { label: "Price per Sheet", unitA: "Rolls", unitB: "Total Sheets", ratio: 425, formula: "Price per Sheet = Total Cost ÷ (Rolls × Sheets per Roll)" },
  "unit-value-calculator": { label: "Unit Value", unitA: "Standard Package", unitB: "Bulk Pack", ratio: 1.5, formula: "Value Ratio = Standard Unit Cost ÷ Bulk Unit Cost" }
};

// Force Next.js to treat this entire dynamic directory route as completely server-rendered at the edge
export const dynamic = "force-dynamic";
export const revalidate = 86400; // Edge lock results in CDN cache networks for 24 hours globally

function resolveProgrammaticSlug(slug: string) {
  // Pattern match structure tracking: {retailer}-{brand}-{category}-{metric}-calculator
  // Example: costco-kirkland-toilet-paper-price-per-sheet-calculator
  const parts = slug.split("-");
  if (parts.length < 5 || parts[parts.length - 1] !== "calculator") return null;

  const retailerKey = parts[0];
  const metricKey = `${parts[parts.length - 3]}-${parts[parts.length - 2]}`;
  
  // Isolate the remaining flexible string blocks into brand and category groups
  const retailerName = RETAILERS[retailerKey];
  const metricData = METRICS[metricKey];

  if (!retailerName || !metricData) return null;

  // Re-aggregate contextual items cleanly
  const brandRaw = parts[1];
  const categoryRaw = parts.slice(2, parts.length - 3).join(" ");

  const brandClean = brandRaw.charAt(0).toUpperCase() + brandRaw.slice(1);
  const categoryClean = categoryRaw.replace(/-/g, " ");

  return {
    retailerName,
    brandClean,
    categoryClean,
    metricLabel: metricData.label,
    unitAName: metricData.unitA,
    unitBName: metricData.unitB,
    ratio: metricData.ratio,
    formula: metricData.formula
  };
}

// REMOVE generateStaticParams entirely - 100K rows breaks compilation boundaries.
// Next.js will resolve all dynamic combinations instantly on request arrival steps.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = resolveProgrammaticSlug(slug);
  
  if (!data) return {};

  const title = `${data.retailerName} ${data.brandClean} ${data.categoryClean} ${data.metricLabel} Calculator`;
  const description = `Calculate true bulk savings metrics for ${data.brandClean} ${data.categoryClean} at ${data.retailerName}. Standardize costs using our free ${data.metricLabel.toLowerCase()} analysis framework.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.budgetlynx.com/calculator/${slug}`
    }
  };
}

export default async function HundredKProgrammaticRouter({ params }: Props) {
  const { slug } = await params;
  const data = resolveProgrammaticSlug(slug);

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <nav className="text-xs text-slate-400 mb-4" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link> /{" "}
          <Link href="/ledger" className="hover:underline">Calculators</Link> /{" "}
          <span className="text-slate-600 dark:text-slate-300">{data.retailerName}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-950 dark:text-white capitalize">
            {data.retailerName} {data.brandClean} {data.categoryClean} {data.metricLabel} Calculator
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Compare package sizing inconsistencies and hidden variations for{" "}
            <strong>{data.brandClean} {data.categoryClean}</strong> distributed by{" "}
            <strong>{data.retailerName}</strong>. Protect your shopping budget from subtle packaging reductions.
          </p>
        </header>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          <CalculatorWidget 
            unitAName={data.unitAName}
            unitBName={data.unitBName}
            ratio={data.ratio}
          />
        </section>

        <article className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold mb-2 text-slate-950 dark:text-white">Analysis Framework</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            When buying packaging configurations of {data.brandClean} products, raw package sizes can shift between retail distribution networks. Using centralized {data.metricLabel.toLowerCase()} protocols clarifies purchasing efficiency data directly at checkout.
          </p>
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 my-4 font-mono text-xs text-emerald-600 dark:text-emerald-400">
            {data.formula}
          </div>
        </article>
      </div>
    </main>
  );
}