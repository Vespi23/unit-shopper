// app/sitemap-products/route.ts
// Secure programmatic generation endpoint for processing deep consumer item nodes
import { NextResponse } from 'next/server';

export const revalidate = 43200; // 12-hour revalidation window

// High-converting long-tail CPG category strings where price optimization discrepancies are standard
const productTargets = [
  'celsius-energy-drink-12-pack',
  '4c-energy-rush-packets',
  'protein-bars-bulk-24-count',
  'whey-protein-isolate-5lb',
  'almond-milk-unsweetened-bulk',
  'toilet-paper-sheets-per-dollar',
  'laundry-detergent-pods-bulk-pack',
  'zero-sugar-soda-cans-bulk',
  'cat-litter-clumping-40lb',
  'k-cup-coffee-pods-100-count'
];

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://budgetlynx.com';

  const xmlEntries = productTargets.map((item) => {
    const encodedQuery = encodeURIComponent(item.replace(/-/g, ' '));
    return `
  <url>
    <loc>${baseUrl}?q=${encodedQuery}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
  }).join('');

  const sitemapPayload = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;

  return new NextResponse(sitemapPayload, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=43200, s-maxage=43200, stale-while-revalidate=600'
    }
  });
}