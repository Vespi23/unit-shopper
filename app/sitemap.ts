// app/sitemap.ts
import { MetadataRoute } from 'next';

export const revalidate = 43200; // Edge cache sitemap generation globally for 12 hours

export async function generateSitemaps() {
  return [
    { id: 'core' },
    { id: 'calculators-weight' },
    { id: 'calculators-volume' },
    { id: 'calculators-retail' }
  ];
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.budgetlynx.com';

  if (id === 'core') {
    return [
      { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
      { url: `${baseUrl}/ledger`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
      { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 }
    ];
  }

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

  return [
    {
      url: `${baseUrl}/calculator/laundry-detergent-price-per-load-calculator`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7
    }
  ];
}