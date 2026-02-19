import { Product } from './types';

export function generateProductSchema(product: Product) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        image: product.image,
        description: product.title, // Amazon API doesn't give a separate description usually, title is best proxy
        sku: product.id,
        mpn: product.id,
        brand: {
            '@type': 'Brand',
            name: 'Unknown', // Rainforest API doesn't always provide brand in search results
        },
        offers: {
            '@type': 'Offer',
            url: product.link,
            priceCurrency: product.currency || 'USD',
            price: product.price || 0,
            availability: 'https://schema.org/InStock', // Defaulting to InStock as we filter mostly available items
        },
    };

    return schema;
}
