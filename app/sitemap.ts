// app/sitemap.ts
import { MetadataRoute } from 'next';
import { client } from '@/sanity/lib/client';

// FIXED: Added explicit Promise return signature to completely resolve ts(1064)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://budgetlynx.com';

  // Base static operational assets
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/ledger`, lastModified: new Date() },
    { url: `${baseUrl}/procure`, lastModified: new Date() },
  ];

  try {
    // Force accurate generation of valid blog entry parameters only
    const posts = await client.fetch(`*[_type == "post"] { "slug": slug.current, _updatedAt }`);
    
    const programmaticBlogRoutes = posts.map((post: any) => ({
      url: `${baseUrl}/ledger/${post.slug}`,
      lastModified: new Date(post._updatedAt || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticRoutes, ...programmaticBlogRoutes];
  } catch {
    return staticRoutes;
  }
}