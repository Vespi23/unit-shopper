import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchProducts } from './api-client';

// Mock fetch
const globalFetch = vi.fn();
global.fetch = globalFetch;

describe('searchProducts', () => {
    beforeEach(() => {
        globalFetch.mockReset();
    });

    it('should fetch and parse products from Decodo HTML successfully', async () => {
        // Mock a basic Amazon search result HTML structure that Cheerio can parse
        const mockHtml = `
            <html>
                <body>
                    <div data-component-type="s-search-result" data-asin="B012345678">
                        <h2>
                            <a href="/dp/B012345678">
                                <span>Test Product - 10 Count</span>
                            </a>
                        </h2>
                        <div class="a-price">
                            <span class="a-offscreen">$10.99</span>
                        </div>
                        <img class="s-image" src="https://example.com/image.jpg" />
                        <i data-cy="reviews-ratings-slot">
                            <span class="a-icon-alt">4.5 out of 5 stars</span>
                        </i>
                        <span class="a-size-base s-underline-text">100</span>
                    </div>
                </body>
            </html>
        `;

        globalFetch.mockResolvedValue({
            ok: true,
            text: async () => mockHtml
        });

        const results = await searchProducts('test query', 1);

        // searchProducts runs 7 concurrent fetches in the new code
        // and deduplicates by ASIN. Since all 7 pages return the exact same mock HTML, we expect 1 unique product back.
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Test Product - 10 Count');
        expect(results[0].price).toBe(10.99);
        expect(results[0].source).toBe('Amazon');
        expect(results[0].rating).toBe(4.5);
        expect(results[0].amount).toBe(10); // Extracted by unit parser
    });

    it('should handle Decodo API errors gracefully', async () => {
        globalFetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        });

        const results = await searchProducts('fail', 1);
        expect(results).toEqual([]);
    });
});

