// app/sitemap.xml/route.ts
import { NextResponse } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // Cache index structures for 24 hours globally

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.budgetlynx.com';

  // Define the split sub-sitemaps to segment crawl limits cleanly
  const sitemaps = [
    `${baseUrl}/sitemaps/core.xml`,
    `${baseUrl}/sitemaps/calculators-weight.xml`,
    `${baseUrl}/sitemaps/calculators-volume.xml`,
    `${baseUrl}/sitemaps/calculators-retail.xml`,
  ];

  // Construct standard XML sitemap index structure
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps
    .map(
      (url) => `  <sitemap>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`
    )
    .join('\n')}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}