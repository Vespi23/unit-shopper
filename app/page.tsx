import { Suspense } from 'react';
import { SearchPage } from '@/components/SearchPage';
import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';
import { searchProducts } from '@/lib/api-client';
import { Product } from '@/lib/types';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  props: Props
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const query = searchParams.q;

  if (query && typeof query === 'string') {
    const decoded = decodeURIComponent(query);
    return {
      title: `${decoded} Unit Price & Deals - BudgetLynx`,
      description: `Find the best unit price for ${decoded}. We compare sizes to find the true best deal on Amazon.`,
      openGraph: {
        images: [`/api/og?title=${encodeURIComponent(decoded)}`],
      },
    };
  }

  return {
    title: 'BudgetLynx - See What Others Miss. Shop by Unit Price.',
    description: 'Stop overpaying on Amazon. Compare true unit prices (per oz, count, lb) instantly to find the best bulk deals and savings.',
  };
}

// JSON-LD Generator
function generateStructuredData(products: Product[], query: string) {
  if (products.length === 0) return null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://www.budgetlynx.com"
    }, {
      "@type": "ListItem",
      "position": 2,
      "name": query,
      "item": `https://www.budgetlynx.com/?q=${encodeURIComponent(query)}`
    }]
  };

  const productListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Best Unit Prices for "${query}"`,
    "description": `Comparison of unit prices for ${query} on Amazon.`,
    "numberOfItems": products.length,
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.title,
        "image": product.image,
        "description": `Unit Price: ${product.pricePerUnit}. Total: $${product.price}.`,
        "sku": product.id,
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": `https://www.budgetlynx.com/?q=${encodeURIComponent(product.title)}` // Self-referential for now as we don't have product pages
        }
      }
    }))
  };

  return [breadcrumbSchema, productListSchema];
}

export default async function Home(props: Props) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === 'string' ? searchParams.q : '';

  let initialResults: Product[] = [];
  let jsonLd: any[] | null = null;

  // SSR Search
  if (query) {
    try {
      initialResults = await searchProducts(query);
      jsonLd = generateStructuredData(initialResults, query);
    } catch (e) {
      console.error("SSR Search Error", e);
    }
  }

  return (
    <>
      {jsonLd && Array.isArray(jsonLd) && jsonLd.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
      ))}
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <SearchPage initialResults={initialResults} />
      </Suspense>
    </>
  );
}
