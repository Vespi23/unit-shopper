// app/calculator/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RETAILERS, BRAND_MAPPING, METRICS } from "@/lib/seo-matrix";
import CalculatorWidget from "./CalculatorWidget";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

function parseValidSlug(slug: string) {
  const parts = slug.split("-");
  if (parts.length < 5 || parts[parts.length - 1] !== "calculator") return null;

  const retailer = parts[0];
  const metric = `${parts[parts.length - 3]}-${parts[parts.length - 2]}`;

  // Validate core infrastructure mappings first
  if (!RETAILERS.includes(retailer) || !METRICS.includes(metric)) return null;

  const brand = parts[1];
  const allowedCategories = BRAND_MAPPING[brand];
  if (!allowedCategories) return null;

  // Extract the category string from the middle segments
  const category = parts.slice(2, parts.length - 3).join("-");
  if (!allowedCategories.includes(category)) return null;

  return {
    retailerName: retailer.charAt(0).toUpperCase() + retailer.slice(1).replace("s-club", "s Club"),
    brandClean: brand.charAt(0).toUpperCase() + brand.slice(1),
    categoryClean: category.replace(/-/g, " "),
    metricLabel: metric.replace(/-/g, " ")
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = parseValidSlug(slug);
  if (!data) return {};

  return {
    title: `${data.retailerName} ${data.brandClean} ${data.categoryClean} ${data.metricLabel} Calculator | BudgetLynx`,
    description: `Calculate savings metrics for ${data.brandClean} ${data.categoryClean} at ${data.retailerName}.`
  };
}

export default async function ProgrammaticCalculatorPage({ params }: Props) {
  const { slug } = await params;
  const data = parseValidSlug(slug);
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-4xl font-black text-slate-950 dark:text-white capitalize">
          {data.retailerName} {data.brandClean} {data.categoryClean} {data.metricLabel} Calculator
        </h1>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm my-6">
          <CalculatorWidget unitAName="Packages" unitBName="Total Units" ratio={1} />
        </div>
      </div>
    </main>
  );
}