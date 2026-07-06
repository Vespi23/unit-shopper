// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@sanity/client';

const targetClient = createClient({
  projectId: '3g5m7g46', 
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

const SITEMAP_MAX_SIZE = 50000;

export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://budgetlynx.com';

  const staticRoutes: MetadataRoute.Sitemap = id === 0 ? [
    { url: baseUrl, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/ledger`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/procure`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), priority: 0.3 },
  ] : [];

  try {
    let blogRoutes: MetadataRoute.Sitemap = [];
    if (id === 0) {
      const posts = await targetClient.fetch(`*[_type == "post" && defined(slug.current)] { "slug": slug.current, _updatedAt }`);
      if (Array.isArray(posts)) {
        blogRoutes = posts.map((post: any) => ({
          url: `${baseUrl}/ledger/${post.slug}`,
          lastModified: new Date(post._updatedAt || Date.now()),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
      }
    }

    const skipValue = id * SITEMAP_MAX_SIZE;
    
    // BROAD SWEEP: Query every possible search/pSEO variant name to find your database collection
    const productQueries = await targetClient.fetch(
      `*[_type in ["productQuery", "pSeoKeyword", "keyword", "search", "product", "seoQuery"]] | order(_createdAt desc) [$skip...$max] {
        "slug": coalesce(keywordSlug, slug.current, keywordValue, slug, keyword, title),
        _updatedAt
      }`,
      { skip: skipValue, max: skipValue + SITEMAP_MAX_SIZE }
    );

    let pSEORoutes: MetadataRoute.Sitemap = [];
    if (Array.isArray(productQueries)) {
      pSEORoutes = productQueries
        .filter((item: any) => item && item.slug)
        .map((item: any) => {
          const targetSlug = typeof item.slug === 'string' ? item.slug : item.slug.current || '';
          if (!targetSlug.trim()) return null;
          return {
            url: `${baseUrl}/search/${encodeURIComponent(targetSlug.trim().toLowerCase())}`,
            lastModified: new Date(item._updatedAt || Date.now()),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          };
        })
        .filter(Boolean) as MetadataRoute.Sitemap;
    }

    return [...staticRoutes, ...blogRoutes, ...pSEORoutes];
  } catch (error) {
    console.error(`[SITEMAP_SHARD_ERROR]: Error on index ${id}`, error);
    return staticRoutes;
  }
}