import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import CalculatorWidget from "./CalculatorWidget";

interface Props {
  params: Promise<{ slug: string }>;
}

interface PageData {
  title: string;
  metaDescription: string;
  heading: string;
  introText: string;
  formulaLabel: string;
  formula: string;
  unitAName: string;
  unitBName: string;
  ratio: number;
}

// Low-overhead JSON programmatic database map
const PSEO_DATABASE: Record<string, PageData> = {
  "ounces-to-pounds-price-calculator": {
    title: "Ounces to Pounds Price Calculator | BudgetLynx",
    metaDescription: "Calculate and compare prices between ounces (oz) and pounds (lbs) instantly. Discover structural savings and defeat supermarket shrinkflation.",
    heading: "Ounces (oz) to Pounds (lbs) Value Calculator",
    introText: "Supermarkets routinely change package sizes from ounces to pounds to obscure unit rate differences. Use our tool to compare them perfectly.",
    formulaLabel: "Price per Pound formula",
    formula: "Price per Lb = Price per Oz × 16",
    unitAName: "Ounces (oz)",
    unitBName: "Pounds (lbs)",
    ratio: 16
  },
  "grams-to-kilograms-price-calculator": {
    title: "Grams to Kilograms Price Calculator | BudgetLynx",
    metaDescription: "Instantly compare grocery unit pricing from grams (g) to kilograms (kg). Unpack structural retail pricing gaps.",
    heading: "Grams (g) to Kilograms (kg) Value Calculator",
    introText: "When buying ingredients in bulk, standardizing metric weights is crucial. Find out if that larger package is actually cheaper.",
    formulaLabel: "Price per Kilogram formula",
    formula: "Price per Kg = Price per Gram × 1000",
    unitAName: "Grams (g)",
    unitBName: "Kilograms (kg)",
    ratio: 1000
  },
  "costco-toilet-paper-value-calculator": {
    title: "Costco Toilet Paper Price Per Sheet Calculator | BudgetLynx",
    metaDescription: "Determine if Costco Kirkland Signature toilet paper is actually a budget saver by calculating pricing down to individual sheets.",
    heading: "Costco Toilet Paper Price-per-Sheet Calculator",
    introText: "Compare warehouse bulk packaging versus typical grocery store retail packs by calculating the cost down to individual roll sheets.",
    formulaLabel: "Price per Sheet formula",
    formula: "Price per Sheet = Total Package Cost ÷ (Total Rolls × Sheets per Roll)",
    unitAName: "Rolls",
    unitBName: "Total Sheets",
    ratio: 425 // Avg sheets per roll
  },
  "laundry-detergent-price-per-load-calculator": {
    title: "Laundry Detergent Cost per Load Calculator | BudgetLynx",
    metaDescription: "Calculate the cost per laundry load instantly. Avoid paying premiums on liquid detergents by checking unit value.",
    heading: "Laundry Detergent Cost-per-Load Calculator",
    introText: "Liquid concentrate volume claims can be deceptive. Calculate your raw pricing down to standard washing loads.",
    formulaLabel: "Price per Load formula",
    formula: "Price per Load = Total Price ÷ Total Specified Loads",
    unitAName: "Fluid Ounces (fl oz)",
    unitBName: "Standard Loads",
    ratio: 1.5 // Average ounces per load
  },
  "costco-kirkland-coffee-pods-calculator": {
    title: "Costco Kirkland K-Cup Price Per Pod Calculator | BudgetLynx",
    metaDescription: "Calculate the exact cost per pod of Costco Kirkland Signature K-Cups to find your true morning coffee budget metrics.",
    heading: "Costco Kirkland Coffee Pod Value Calculator",
    introText: "Bulk coffee pod sizes often mask the true cost per individual cup. Use our calculator to determine the raw breakdown.",
    formulaLabel: "Price per individual pod formula",
    formula: "Price per Pod = Total Package Price ÷ Total Pod Count",
    unitAName: "Boxes",
    unitBName: "Total Pods",
    ratio: 120 // Standard warehouse pod count per pack
  },
};

export async function generateStaticParams() {
  return Object.keys(PSEO_DATABASE).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = PSEO_DATABASE[slug];

  if (!page) return {};

  return {
    title: page.title,
    description: page.metaDescription,
    alternates: {
      canonical: `https://budgetlynx.com/calculator/${slug}`,
    }
  };
}

export default async function ProgrammaticCalculatorPage({ params }: Props) {
  const { slug } = await params;
  const page = PSEO_DATABASE[slug];

  if (!page) {
    notFound();
  }

  // Schema construction targeting rich SERP Snippets
  const schemaJson = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `https://budgetlynx.com/calculator/${slug}#webapp`,
        "name": page.heading,
        "applicationCategory": "UtilityApplication",
        "operatingSystem": "All",
        "browserRequirements": "Requires HTML5/JavaScript",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `How do you calculate unit pricing for ${page.unitAName} vs ${page.unitBName}?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `To standardise the calculation: utilize our free value calculator to normalize weights/measurements to a single standard size, revealing hidden premiums immediately.`
            }
          }
        ]
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
      />

      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* SEO Structured Breadcrumbs */}
          <nav className="text-sm text-slate-500 dark:text-slate-400 mb-6" aria-label="Breadcrumb">
            <ol className="list-none p-0 inline-flex space-x-2">
              <li className="flex items-center">
                <Link href="/" className="hover:underline">Home</Link>
                <span className="mx-2">/</span>
              </li>
              <li className="flex items-center">
                <Link href="/ledger" className="hover:underline">Ledger</Link>
                <span className="mx-2">/</span>
              </li>
              <li className="text-slate-800 dark:text-slate-200 font-medium" aria-current="page">
                {page.heading}
              </li>
            </ol>
          </nav>

          {/* Core Copy Element */}
          <header className="mb-10 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {page.heading}
            </h1>
            <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
              {page.introText}
            </p>
          </header>

          {/* Fully Interactive Widget */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 mb-10">
            <CalculatorWidget 
              unitAName={page.unitAName}
              unitBName={page.unitBName}
              ratio={page.ratio}
            />
          </section>

          {/* High-quality content block to pass the Google Helpful Content System (HCS) */}
          <article className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white mb-4">
              Value Math Breakdown
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Hidden cost variations usually occur when brands adjust container packaging while leaving raw shelf prices unchanged. This makes direct shopping value comparison difficult for consumers without standardizing measurements.
            </p>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4 my-6">
              <h3 className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-2">
                {page.formulaLabel}
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200 font-mono">
                {page.formula}
              </p>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Use our calculator daily to bypass these deceptive packaging configurations and track true unit values during shopping trips.
            </p>
          </article>
        </div>
      </main>
    </>
  );
}