// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://budgetlynx.com';

  // FORCE-THROUGH WORKAROUND: Explicitly define base pages to ensure immediate compilation stability
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/ledger`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/procure`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), priority: 0.3 },
  ];

  // Hardcoded project token fallback guarantees execution even if Vercel variables are missing during compilation
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'missing';
  if (projectId === 'missing') {
    console.warn("[SITEMAP_WARNING]: Environment tokens absent. Serving base layout assets.");
    return staticRoutes;
  }

  try {
    const dynamicClient = createClient({
      projectId: projectId,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      useCdn: false,
    });

    // Safely pull your 11 valid Lynx Ledger posts
    const posts = await dynamicClient.fetch(`*[_type == "post" && defined(slug.current)] { "slug": slug.current, _updatedAt }`);
    
    if (Array.isArray(posts) && posts.length > 0) {
      const blogRoutes = posts.map((post: any) => ({
        url: `${baseUrl}/ledger/${post.slug}`,
        lastModified: new Date(post._updatedAt || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
      return [...staticRoutes, ...blogRoutes];
    }

    return staticRoutes;
  } catch (error) {
    console.error("[SITEMAP_CRASH_RECOVERY]: Dynamic query exception thrown. Falling back to base entries.", error);
    return staticRoutes;
  }
}