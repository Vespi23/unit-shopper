// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@sanity/client';

// Hardened inline initialization to safeguard against path alias bottlenecks
const dynamicClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'missing',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

const SITEMAP_MAX_SIZE = 50000;

export async function generateSitemaps() {
  // Always output two index shards securely to anchor up to 100,000 routes
  return [{ id: 0 }, { id: 1 }];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://budgetlynx.com';

  // FORCE-THROUGH WORKAROUND: Hardcode base layout targets outside the try-catch block 
  // to guarantee Shard 0 is never completely empty if a database drops offline.
  const staticRoutes: MetadataRoute.Sitemap = id === 0 ? [
    { url: baseUrl, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/ledger`, lastModified: new Date(), priority: 0.7 },
    { url: `${baseUrl}/procure`, lastModified: new Date(), priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), priority: 0.3 },
  ] : [];

  // If environment tokens are missing during build parameters, return the baseline structures immediately
  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID === undefined) {
    return staticRoutes;
  }

  try {
    let blogRoutes: MetadataRoute.Sitemap = [];
    
    if (id === 0) {
      // Pull editorial blog metadata configurations safely
      const posts = await dynamicClient.fetch(`*[_type == "post" && defined(slug.current)] { "slug": slug.current, _updatedAt }`);
      if (Array.isArray(posts)) {
        blogRoutes = posts.map((post: any) => ({
          url: `${baseUrl}/ledger/${post.slug}`,
          lastModified: new Date(post._updatedAt || Date.now()),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }));
      }
    }

    // Paginate and fetch your pSEO keyword entries from the database
    const skipValue = id * SITEMAP_MAX_SIZE;
    
    // SAFETY RECOVERY: Query both common schema variants ('productQuery' or 'pSeoKeyword') 
    // to prevent empty tracking loops if your system uses an alternate identifier name.
    const programmaticKeywords = await dynamicClient.fetch(
      `*[_type in ["productQuery", "pSeoKeyword"]] | order(_createdAt desc) [$skip...$max] {
        "slug": coalesce(keywordSlug, slug.current, keywordValue),
        _updatedAt
      }`,
      { skip: skipValue, max: skipValue + SITEMAP_MAX_SIZE }
    );

    let programmaticRoutes: MetadataRoute.Sitemap = [];
    if (Array.isArray(programmaticKeywords)) {
      programmaticRoutes = programmaticKeywords
        .filter((item: any) => item && item.slug)
        .map((item: any) => ({
          url: `${baseUrl}/search/${encodeURIComponent(item.slug.trim())}`,
          lastModified: new Date(item._updatedAt || Date.now()),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }));
    }

    return [...staticRoutes, ...blogRoutes, ...programmaticRoutes];
  } catch (error) {
    console.warn(`[SITEMAP_FALLBACK_TRIGGERED]: Error on shard index ${id}. Serving base entries. Trace:`, error);
    return staticRoutes;
  }
}