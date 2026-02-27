import 'server-only';
import { Product } from './types';
import { parseUnit, calculatePricePerUnit, normalizeUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

// Simple in-memory cache to save API quota
// Key: query + page, Value: { timestamp: number, data: Product[] }
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours
const searchCache = new Map<string, { timestamp: number, data: Product[] }>();

// Map of base queries that receive severe accessory bloat and require exact-phrase quotation
const EXACT_MATCH_QUERIES = new Set([
    'toilet paper',
    'paper towel',
    'paper towels'
]);

export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {

    // Security: Truncate query to prevent abuse
    const MAX_QUERY_LENGTH = 100;
    if (query.length > MAX_QUERY_LENGTH) {
        console.warn(`Query truncated from ${query.length} to ${MAX_QUERY_LENGTH} chars`);
        query = query.substring(0, MAX_QUERY_LENGTH);
    }

    // Check Cache
    const cacheKey = `${query.toLowerCase().trim()}-multi-v3-decodo`;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
        console.log(`[CACHE HIT] Serving results for: ${query} (Multi-page)`);
        return cached.data;
    }

    try {
        console.log(`[API CALL] Fetching Decodo Web Scraping API for: ${query} (Pages 1-7)`);

        let apiSearchTerm = query;
        if (EXACT_MATCH_QUERIES.has(query.toLowerCase().trim())) {
            apiSearchTerm = `"${apiSearchTerm}"`;
            console.log(`[API EXACT MATCH] Wrapping query in double quotes: ${apiSearchTerm}`);
        }

        // As explicitly requested by the user, we now aggressively force ALL searches
        // to be exact phrase matches by wrapping them in double quotes. This fundamentally
        // prevents Amazon from serving category node storefronts (e.g. for generic terms like 'book')
        // and guarantees a scrape-able product grid.
        if (!apiSearchTerm.startsWith('"') && !apiSearchTerm.endsWith('"')) {
            apiSearchTerm = `"${apiSearchTerm}"`;
        }

        console.log(`[API EXACT MATCH] Query is wrapped in double quotes universally: ${apiSearchTerm}`);

        const encodedSearchTerm = encodeURIComponent(apiSearchTerm);
        // Using "k" for keyword search param on Amazon
        const baseUrl = `https://www.amazon.com/s?k=${encodedSearchTerm}`;

        // Helper function to fetch a single page via Decodo
        const fetchPage = async (p: number, urlBase: string): Promise<string | null> => {
            const amazonUrl = p === 1 ? urlBase : `${urlBase}&page=${p}`;
            const decodoUrl = `https://scraper-api.decodo.com/v2/scrape`;
            try {
                const res = await fetch(decodoUrl, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`
                    },
                    body: JSON.stringify({ url: amazonUrl })
                });
                if (!res.ok) throw new Error(`Decodo API failed with status ${res.status}`);
                const json = await res.json();
                // Decodo v2 JSON response encapsulates the HTML inside a 'results' array
                if (json && json.results && json.results.length > 0 && json.results[0].content) {
                    return json.results[0].content;
                }
                if (json && json.content) return json.content;
                if (json && json.body) return json.body;
                return json; // Fallback
            } catch (err) {
                console.error(`Page ${p} fetch error:`, err);
                return null;
            }
        };

        // Fetch Pages 1-7 concurrently since we know the exact-match quote prevents the category redirect
        console.log(`[API CALL] Fetching Pages 1-7 concurrently for exact match...`);
        const pagePromises = [];
        for (let p = 1; p <= 7; p++) {
            pagePromises.push(fetchPage(p, baseUrl));
        }

        const htmlResults = await Promise.all(pagePromises);
        let allProducts: Product[] = [];

        htmlResults.forEach((html, index) => {
            const pageNum = index + 1;
            if (html) {
                const parsedProducts = parseAmazonHTML(html as string);
                allProducts = [...allProducts, ...parsedProducts];
                console.log(`Page ${pageNum}: Found ${parsedProducts.length} products`);
            }
        });
        // Ensure unique results by ASIN (id is ASIN)
        const uniqueProductsMap = new Map<string, Product>();
        allProducts.forEach(product => {
            if (!uniqueProductsMap.has(product.id)) {
                uniqueProductsMap.set(product.id, product);
            }
        });
        const uniqueProducts = Array.from(uniqueProductsMap.values());

        const filteredResults = uniqueProducts.filter((product: Product) => {
            if (product.rating === undefined || product.rating < 4) return false;
            if (product.price === 0) return false;
            return true;
        });

        console.log(`[API STATS] Decodo fetched -> ${allProducts.length} raw parsed -> ${filteredResults.length} filtered (4+ stars)`);

        // Save to Cache
        if (filteredResults.length > 0) {
            searchCache.set(cacheKey, {
                timestamp: Date.now(),
                data: filteredResults
            });
        }

        return filteredResults;

    } catch (error) {
        console.error('Error fetching from Decodo Scraper API:', error);
        if (cached) {
            console.log(`[CACHE FALLBACK] Serving stale results due to error for: ${query}`);
            return cached.data;
        }
        return [];
    }
}


function parseAmazonHTML(html: string): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];

    // Select all search result items (ignoring some sponsored blocks that don't match the general grid)
    $('div[data-component-type="s-search-result"]').each((i, element) => {
        const item = $(element);

        // ASIN
        const asin = item.attr('data-asin') || String(Math.random());

        // Title
        let title = item.find('h2 a span').text().trim();
        if (!title) title = item.find('h2 span').text().trim();
        if (!title) title = item.find('span.a-text-normal').text().trim();

        if (!title) return; // Skip if no title

        // Price
        let price = 0;
        const priceElement = item.find('.a-price span.a-offscreen').first();
        if (priceElement.length > 0) {
            const priceText = priceElement.text();
            // Remove $ and commas
            const cleanedPriceText = priceText.replace(/[\$,]/g, '').trim();
            const parsedPrice = parseFloat(cleanedPriceText);
            if (!isNaN(parsedPrice)) {
                price = parsedPrice;
            }
        }

        // Image
        const imageElement = item.find('img.s-image').first();
        const image = imageElement.attr('src') || '';

        // Rating
        let rating = 0;
        const ratingElement = item.find('i[data-cy="reviews-ratings-slot"] span.a-icon-alt, span[aria-label*="out of 5 stars"]').first();
        if (ratingElement.length > 0) {
            const ratingText = ratingElement.text() || ratingElement.attr('aria-label') || '';
            const ratingMatch = ratingText.match(/([0-9.]+) out of 5/);
            if (ratingMatch && ratingMatch[1]) {
                rating = parseFloat(ratingMatch[1]);
            }
        }

        // Reviews Total
        let reviews = 0;
        const reviewsElement = item.find('span.a-size-base.s-underline-text').first();
        if (reviewsElement.length > 0) {
            const parseNum = parseInt(reviewsElement.text().replace(/[,()]/g, ''), 10);
            if (!isNaN(parseNum)) {
                reviews = parseNum;
            }
        }

        // Affiliate Link Processing
        const link = getAmazonAffiliateLink(asin);

        // Unit Calculation Map
        const unitInfo = parseUnit(title);

        let pricePerUnit = 'N/A';
        let unit: any = 'unknown';
        let value = 0;
        let totalValue = 0;

        if (unitInfo) {
            unit = unitInfo.unit;
            value = unitInfo.value;
            totalValue = unitInfo.totalValue;
            pricePerUnit = calculatePricePerUnit(price, unitInfo.totalValue, unitInfo.unit);
        }

        let score = 999999;
        if (unitInfo && price > 0) {
            const normalized = normalizeUnit(unitInfo);
            if (normalized.totalValue > 0) {
                score = price / normalized.totalValue;
            }
        } else if (price > 0 && totalValue > 0) {
            score = price / totalValue;
        } else if (price > 0) {
            score = price;
        }

        products.push({
            id: asin,
            title,
            price,
            image,
            source: 'Amazon',
            rating,
            reviews,
            unit,
            amount: value,
            totalAmount: totalValue,
            pricePerUnit,
            link,
            currency: 'USD',
            originalPrice: 0,
            score,
            unitInfo: unitInfo || undefined
        });
    });

    return products;
}
