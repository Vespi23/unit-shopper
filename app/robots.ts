import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // CRITICAL PARAMETER SHIELD: Prevents web spiders from crawling viral tracking signatures
            disallow: [
                '/*ref=sharesavings',
                '/*q=*&ref=*'
            ],
        },
        // Updated to align perfectly with your programmatic shard generation endpoints
        sitemap: 'https://www.budgetlynx.com/api/sitemap-index',
    };
}