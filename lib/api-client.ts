import { Product } from './types';
import { parseUnit, calculatePricePerUnit, normalizeUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

// --- CONSTANTS ---
const EXACT_MATCH_QUERIES = new Set(['toilet paper', 'paper towel', 'paper towels']);
const RATING_REGEX = /([0-9.]+) out of 5|([0-9.]+)\sstars/i;

export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {
    const START_TIME = Date.now();
    const MAX_EXECUTION_TIME_MS = 54000; 
    const cacheKey = query.toLowerCase().trim().substring(0, 100);

    // ... (Cache check preserved) ...

    try {
        // FIX: Use backticks for proper string interpolation
        const apiSearchTerm = EXACT_MATCH_QUERIES.has(cacheKey) ? `"${cacheKey}"` : cacheKey;
        const baseUrl = `https://www.amazon.com/s?k=${encodeURIComponent(apiSearchTerm)}`;
        
        const fetchPage = async (p: number): Promise<Product[]> => {
            // FIX: Corrected template literal for page pagination
            const amazonUrl = p === 1 ? baseUrl : `${baseUrl}&page=${p}`;
            try {
                const res = await fetch(`https://scraper-api.decodo.com/v2/scrape`, {
                    method: 'POST',
                    headers: { 'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: amazonUrl, proxy_pool: "premium", headless: "html" })
                });
                const json = await res.json();
                const html = json.results?.[0]?.content || json.content || null;
                return html ? parseAmazonHTML(html) : [];
            } catch (err) { return []; }
        };

        const pageNumbers = [1, 2, 3, 4, 5, 6, 7];
        const SCRAPE_TIMEOUT_MS = 30000; // Cap scrape at 30s to save room for AI

        const pagePromises = pageNumbers.map(p => {
            const delay = (p - 1) * 150; 
            return new Promise<Product[]>(async (resolve) => {
                await new Promise(r => setTimeout(r, delay));
                const timeout = setTimeout(() => resolve([]), SCRAPE_TIMEOUT_MS);
                const products = await fetchPage(p);
                clearTimeout(timeout);
                resolve(products);
            });
        });

        const settleResults = await Promise.allSettled(pagePromises);
        let allProducts: Product[] = [];
        settleResults.forEach(res => { if (res.status === 'fulfilled') allProducts = [...allProducts, ...res.value]; });

        const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());
        
        // DYNAMIC FILTER: Lower review floor to 50 if zero results are found at 100
        let filteredResults = uniqueProducts.filter(p => (p.rating ?? 0) >= 3.8 && (p.reviews ?? 0) >= 50);
        
        if (filteredResults.length === 0) {
             console.warn(`[WARNING] No results at floor 50. Returning raw matches for: ${apiSearchTerm}`);
             filteredResults = uniqueProducts.slice(0, 20); 
        }

        filteredResults.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));

        // ... (AI Tie-Breaker logic remains same, but check for backticks there too) ...

        console.log(`✅ Search Complete in ${(Date.now() - START_TIME)/1000}s. Returning ${filteredResults.length} items.`);
        return filteredResults;
    } catch (error) { return []; }
}

function parseAmazonHTML(html: string): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];
    $('div[data-component-type="s-search-result"]').each((i, element) => {
        const item = $(element);
        
        // ROBUST RATING EXTRACTION: Try multiple selectors
        const ratingRaw = item.find('span[aria-label*="out of 5 stars"], i.a-icon-star span.a-icon-alt, .a-icon-star-small .a-icon-alt').first().text();
        const ratingMatch = ratingRaw.match(RATING_REGEX);
        const rating = ratingMatch ? parseFloat(ratingMatch[1] || ratingMatch[2]) : 0;

        const reviewsText = item.find('span.a-size-base.s-underline-text, .a-size-small .a-size-base').first().text().replace(/[,()]/g, '');
        const reviews = parseInt(reviewsText, 10) || 0;

        // ... (remaining parsing logic) ...
    });
    return products;
}