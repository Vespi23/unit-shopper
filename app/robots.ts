// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/', 
          '/ledger',          
          '/api/og'           
        ],
        disallow: [
          '/*ref=sharesavings',
          '/*q=*&ref=*',
          '/*?*',             // Restricts crawled tracking/parameter variations from polluting indices
          '/api/',            // Shields data routers and serverless API sub-folders
          '/admin/',          // Restricts engine visibility on administrative portals
          '/*_next/static/*', // Blocks redundant static framework asset loops
        ],
      },
    ],
    // Points directly to the automatically generated native canonical endpoint
    sitemap: 'https://budgetlynx.com/sitemap.xml',
  };
}