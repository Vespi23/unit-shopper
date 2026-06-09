// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { client as sanityClient } from '@/sanity/lib/client';

export const revalidate = 43200; // Edge-cache compilation footprint for exactly 12 hours

// Initialize connection allocation utilizing standard architecture variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false } // Disable storage engine tracking for serverless compute optimization
});

interface CompiledRouteNode {
  url: string;
  lastModified: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fix domain mismatch fragmentation across assets by establishing a uniform baseline string
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.budgetlynx.com';

  const staticRoutes: CompiledRouteNode[] = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/ledger`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 }
  ];

  let ledgerRoutes: CompiledRouteNode[] = [];
  let programmaticProductRoutes: CompiledRouteNode[] = [];

  // Parallel Execution Block to prevent database/CMS roundtrip blocking bottlenecks
  await Promise.all([
    // Pipeline Node 1: Fetch Editorial Media Logs from Sanity
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
        console.error("Sanity Ledger route resolution engine failure:", err);
      }
    })(),

    // Pipeline Node 2: Fetch Programmatic Target Keywords from Supabase
    (async () => {
      try {
        // Enforce pagination limits to avoid Vercel edge runtime container memory limit triggers
        const { data, error } = await supabase
          .from('product_queries')
          .select('query_string')
          .order('created_at', { ascending: false })
          .limit(4000);

        if (error) throw error;

        if (data) {
          programmaticProductRoutes = data.map((item: any) => ({
            // Clean alignment with main index lookup controller framework (?q=)
            url: `${baseUrl}/?q=${encodeURIComponent(item.query_string.trim())}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9
          }));
        }
      } catch (err) {
        console.error("Supabase programmatic product keyword indexer failure:", err);
      }
    })()
  ]);

  return [...staticRoutes, ...ledgerRoutes, ...programmaticProductRoutes] as MetadataRoute.Sitemap;
}