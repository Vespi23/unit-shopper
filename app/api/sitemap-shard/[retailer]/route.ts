// app/api/sitemap-shard/[retailer]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSlugsByRetailer } from '@/lib/seo-matrix';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ retailer: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const { retailer } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.budgetlynx.com';
  
  const slugs = generateSlugsByRetailer(retailer);

  if (slugs.length === 0) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { 'Content-Type': 'application/xml' }
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${slugs
    .map(
      (slug) => `  <url>
    <loc>${baseUrl}/calculator/${slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}