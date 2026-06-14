// app/sitemap.ts
import { MetadataRoute } from 'next';

export const revalidate = 43200; // Edge cache sitemap generation globally for 12 hours

// Native multi-sitemap index generator safely handled by Next.js compiler layers
export async function generateSitemaps() {
  // Tell Next.js we are breaking our 100K pages down into 4 distinct index targets
  return [
    { id: 'core' },
    { id: 'calculators-weight' },
    { id: 'calculators-volume' },
    { id: 'calculators-retail' }
  ];
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.budgetlynx.com';

  // Handle individual sitemap generation dynamically based on the incoming ID chunk
  if (id === 'core') {
    return [
      { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
      { url: `${baseUrl}/ledger`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
      { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 }
    ];
  }

  // Generate programmatic long-tail pages dynamically inside their respective shards
  // This keeps your individual chunk sizes safely under 50,000 items
  if (id === 'calculators-weight') {
    const weightSlugs = ["ounces-to-pounds-price-calculator", "grams-to-kilograms-price-calculator"];
    return weightSlugs.map(slug => ({
      url: `${baseUrl}/calculator/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7
    }));
  }

  if (id === 'calculators-retail') {
    const retailSlugs = ["costco-toilet-paper-value-calculator", "costco-kirkland-coffee-pods-calculator"];
    return retailSlugs.map(slug => ({
      url: `${baseUrl}/calculator/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7
    }));
  }

  // Fallback catch-all group
  return [
    {
      url: `${baseUrl}/calculator/laundry-detergent-price-per-load-calculator`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7
    }
  ];
}