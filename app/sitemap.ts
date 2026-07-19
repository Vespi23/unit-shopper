// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

const targetClient = createClient({
  projectId: '7st9no77', 
  dataset: 'production', 
  apiVersion: '2024-01-01',
  useCdn: false,
});

const SITEMAP_MAX_SIZE = 50000;

export async function generateSitemaps() {
  // Back to exactly two clean shards handling core site assets and pSEO keywords
  return [{ id: 0 }, { id: 1 }];
}

export default async function sitemap({ id }: { id: any }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.budgetlynx.com';
  const shardId = parseInt(String(id || '0'), 10) || 0;

  // Shard 0 Core Static App Pages
  const staticRoutes: MetadataRoute.Sitemap = shardId === 0 ? [
    { url: baseUrl, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/ledger`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/procure`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), priority: 0.3 },
  ] : [];

  try {
    let blogRoutes: MetadataRoute.Sitemap = [];
    if (shardId === 0) {
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

    const skipValue = shardId * SITEMAP_MAX_SIZE;
    
    const productQueries = await targetClient.fetch(
      `*[_type in ["productQuery", "pSeoKeyword"]] | order(_createdAt desc) [$skip...$skip + $limit] {
        "slug": coalesce(keywordSlug, slug.current, keywordValue),
        _updatedAt
      }`,
      { skip: skipValue, limit: SITEMAP_MAX_SIZE }
    );

    let pSEORoutes: MetadataRoute.Sitemap = [];
    if (Array.isArray(productQueries) && productQueries.length > 0) {
      pSEORoutes = productQueries
        .filter((item: any) => item && item.slug)
        .map((item: any) => {
          const targetSlug = typeof item.slug === 'string' ? item.slug : item.slug.current || '';
          const trimmedSlug = targetSlug.trim().toLowerCase();
          if (!trimmedSlug) return null;

          const finalSlugPath = trimmedSlug.includes(' ') 
            ? encodeURIComponent(trimmedSlug).replace(/%20/g, '-') 
            : trimmedSlug;

          return {
            url: `${baseUrl}/search/${finalSlugPath}`,
            lastModified: new Date(item._updatedAt || Date.now()),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          };
        })
        .filter(Boolean) as MetadataRoute.Sitemap;
    }

    return [...staticRoutes, ...blogRoutes, ...pSEORoutes];
  } catch (error) {
    console.error(`[SITEMAP_SHARD_ERROR]: Execution failure on index ${shardId}`, error);
    return staticRoutes;
  }
}