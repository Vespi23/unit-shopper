// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        // FIXED: Arranged as clean, type-compliant string arrays to prevent compilation blocks
        disallow: [
          '/*ref=sharesavings',
          '/*q=*&ref=*',
          '/*?*',             // Restricts crawled parameter variations from polluting indices
          '/api/',            // Shields data routers
          '/admin/',          // Restricts engine visibility on workspace portals
          '/*_next/static/*', // Blocks redundant file parsing loops
        ],
      },
    ],
    // FIXED: Shifted canonical endpoint to native file structure to prevent indexing loops
    sitemap: 'https://budgetlynx.com/sitemap.xml',
  };
}