import { Product } from './types';

/**
 * Scraper-Safe Schema Generator
 * Protects against null values common in raw web scraping.
 */
export function generateProductSchema(product: Product) {
    if (!product || !product.title) return {};

    // Ensure price is a number, even if the scraper sends a string
    const numericPrice = typeof product.price === 'string' 
        ? parseFloat((product.price as string).replace(/[^0-9.]/g, '')) 
        : product.price;

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        // Fallback to a placeholder if the scraper misses the image
        image: product.image || 'https://www.budgetlynx.com/logo.png',
        description: `Compare true unit prices and find the best value for ${product.title}.`,
        sku: product.id || `bl-${Math.random().toString(36).substr(2, 9)}`,
        brand: {
            '@type': 'Brand',
            name: product.title.split(' ')[0] || 'BudgetLynx Verified',
        },
        offers: {
            '@type': 'Offer',
            url: product.link,
            priceCurrency: product.currency || 'USD',
            ...(numericPrice && numericPrice > 0 ? { price: numericPrice } : {}),
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
        },
    };
}