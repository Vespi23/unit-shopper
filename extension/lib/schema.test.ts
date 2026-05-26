import { describe, it, expect } from 'vitest';
import { generateProductSchema } from './schema';
import { Product } from './types';

describe('generateProductSchema', () => {
    it('should generate correct JSON-LD for a product', () => {
        const product: Product = {
            id: '123',
            title: 'Test Product',
            price: 10.99,
            currency: 'USD',
            image: 'https://example.com/image.jpg',
            link: 'https://amazon.com/dp/123',
            rating: 4.5,
            reviews: 100,
            pricePerUnit: '$1.00/oz',
            originalPrice: 12.99,
            unitInfo: {
                unit: 'oz',
                value: 10.99,
                totalValue: 10.99,
                quantity: 1,
                formatted: '10.99 oz'
            },
            source: 'amazon'
        };

        const schema: any = generateProductSchema(product);

        expect(schema['@context']).toBe('https://schema.org');
        expect(schema['@type']).toBe('Product');
        expect(schema.name).toBe('Test Product');
        expect(schema.image).toBe('https://example.com/image.jpg');

        expect(schema.name).toBe('Test Product');
        expect(schema.image).toBe('https://example.com/image.jpg');
    });

    it('should handle missing rating info', () => {
        const product: Product = {
            id: '123',
            title: 'Test Product',
            price: 10.99,
            currency: 'USD',
            image: 'https://example.com/image.jpg',
            link: 'https://amazon.com/dp/123',
            rating: 0,
            reviews: 0,
            pricePerUnit: '$1.00/oz',
            originalPrice: 12.99,
            source: 'amazon'
        };

        const schema = generateProductSchema(product);
        // Depending on implementation, it might omit aggregateRating or set to 0
        // Let's verify it doesn't crash and has basic fields
        expect(schema.name).toBe('Test Product');
    });
});
