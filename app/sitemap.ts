// app/sitemap.ts
import { MetadataRoute } from 'next';
import { client as sanityClient } from '@/sanity/lib/client';

export const revalidate = 43200; // Edge cache sitemap generation globally for 12 hours

interface SitemapNode {
  url: string;
  lastModified: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
}

// Low-latency local registry of dynamic calculator paths
const CALCULATOR_SLUGS = [
  "ounces-to-pounds-price-calculator",
  "grams-to-kilograms-price-calculator",
  "costco-toilet-paper-value-calculator",
  "laundry-detergent-price-per-load-calculator",
  "costco-kirkland-coffee-pods-calculator"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.budgetlynx.com';

  const staticRoutes: SitemapNode[] = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/ledger`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 }
  ];

  // Map local pSEO files directly with zero network overhead
  const calculatorRoutes: SitemapNode[] = CALCULATOR_SLUGS.map((slug) => ({
    url: `${baseUrl}/calculator/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7
  }));

  let ledgerRoutes: SitemapNode[] = [];
  let programmaticQueryRoutes: SitemapNode[] = [];

  // Execute Sanity content queries in parallel to optimize build limits
  await Promise.all([
    // 1. Resolve manual Editorial Review paths from the Ledger
    (async () => {
      try {
        const query = `*[_type == "post" && defined(slug.current)] { "slug": slug.current }`;
        const posts = await sanityClient.fetch(query);
        ledgerRoutes = posts.map((post: any) => ({
          url: `${baseUrl}/ledger/${post.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7
        }));
      } catch (err) {
        console.error("Sanity Ledger path fetch error:", err);
      }
    })(),

    // 2. Resolve automated keyword targets from 'productQuery' collection inside Sanity
    (async () => {
      try {
        const query = `*[_type == "productQuery" && defined(slug.current)][0...3000] { "slug": slug.current }`;
        const items = await sanityClient.fetch(query);
        programmaticQueryRoutes = items.map((item: any) => ({
          url: `${baseUrl}/?q=${encodeURIComponent(item.slug.replace(/-/g, ' '))}`,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.9
        }));
      } catch (err) {
        console.error("Sanity Programmatic target fetch error:", err);
      }
    })()
  ]);

  // Merge static routes, calculator assets, blog paths, and query indexes
  const totalRoutes = [
    ...staticRoutes,
    ...calculatorRoutes,
    ...ledgerRoutes,
    ...programmaticQueryRoutes
  ];

  // Sanitize URLs to prevent crawl-budget waste from structural duplicate slashes
  return totalRoutes.map((node) => ({
    ...node,
    url: node.url.replace(/([^:]\/)\/+/g, "$1")
  })) as MetadataRoute.Sitemap;
}