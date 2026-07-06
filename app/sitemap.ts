// app/sitemap.ts
import { MetadataRoute } from 'next';
import { client } from '@/sanity/lib/client';

const SITEMAP_MAX_SIZE = 50000;

export async function generateSitemaps() {
  // Break down 100,000 total programmatic URLs across two index fragments
  return [{ id: 0 }, { id: 1 }];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://budgetlynx.com';

  // Base utility and marketing anchors are included exclusively in the first shard index
  const staticRoutes: MetadataRoute.Sitemap = id === 0 ? [
    { url: baseUrl, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/ledger`, lastModified: new Date(), priority: 0.7 },
    { url: `${baseUrl}/procure`, lastModified: new Date(), priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), priority: 0.3 },
  ] : [];

  try {
    let blogRoutes: MetadataRoute.Sitemap = [];
    
    if (id === 0) {
      // Map editorial blog entries from Lynx Ledger
      const posts = await client.fetch(`*[_type == "post"] { "slug": slug.current, _updatedAt }`);
      blogRoutes = posts.map((post: any) => ({
        url: `${baseUrl}/ledger/${post.slug}`,
        lastModified: new Date(post._updatedAt || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }

    // Paginate database extraction block for pSEO keywords
    const skipValue = id * SITEMAP_MAX_SIZE;
    const programmaticKeywords = await client.fetch(
      `*[_type == "productQuery"] | order(_createdAt desc) [$skip...$max] {
        "slug": keywordSlug,
        _updatedAt
      }`,
      { skip: skipValue, max: skipValue + SITEMAP_MAX_SIZE }
    );

    const programmaticRoutes = programmaticKeywords.map((item: any) => ({
      url: `${baseUrl}/search/${item.slug}`,
      lastModified: new Date(item._updatedAt || Date.now()),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...blogRoutes, ...programmaticRoutes];
  } catch (error) {
    console.error(`[SITEMAP_GENERATION_EXCEPTION]: Failed to compile shard index ${id}`, error);
    return staticRoutes;
  }
}