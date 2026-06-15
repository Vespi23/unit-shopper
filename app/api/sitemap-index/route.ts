// app/api/sitemap-index/route.ts
import { NextResponse } from 'next/server';
import { RETAILERS } from '@/lib/seo-matrix';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.budgetlynx.com';

  // Build out standard index maps pointing straight to our custom sub-sitemap routes
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${RETAILERS
    .map(
      (retailer) => `  <sitemap>
    <loc>${baseUrl}/api/sitemap-shard/${retailer}</loc>
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