import 'server-only';
import { Product } from './types';
import { parseUnit, calculatePricePerUnit } from './unit-parser';

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';

// Simple in-memory cache to save API quota
// Key: query + page, Value: { timestamp: number, data: Product[] }
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours
const searchCache = new Map<string, { timestamp: number, data: Product[] }>();

export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {
    if (!RAINFOREST_API_KEY) {
        console.warn('RAINFOREST_API_KEY is missing');
        return [];
    }

    // Security: Truncate query to prevent abuse
    const MAX_QUERY_LENGTH = 100;
    if (query.length > MAX_QUERY_LENGTH) {
        console.warn(`Query truncated from ${query.length} to ${MAX_QUERY_LENGTH} chars`);
        query = query.substring(0, MAX_QUERY_LENGTH);
    }

    // Check Cache
    const cacheKey = `${query.toLowerCase().trim()}-${page}`;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
        console.log(`[CACHE HIT] Serving results for: ${query} (Page ${page})`);
        return cached.data;
    }

    const params = new URLSearchParams({
        api_key: RAINFOREST_API_KEY,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: query,
        page: page.toString()
        // Removed sort_by: 'featured' to diversify results and not only pull featured
    });

    try {
        console.log(`[API CALL] Fetching Rainforest API for: ${query}, page: ${page}`);
        const response = await fetch(`${BASE_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Rainforest API failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.request_info && data.request_info.success === false) {
            console.error('Rainforest API Error:', data.request_info.message);
            return [];
        }

        const rawResults = data.search_results || [];
        const results = rawResults
            .map((item: any) => mapRainforestResult(item))
            .filter((product: Product) => product.rating !== undefined && product.rating >= 4);

        // Save to Cache
        if (results.length > 0) {
            searchCache.set(cacheKey, {
                timestamp: Date.now(),
                data: results
            });
        }

        return results;

    } catch (error) {
        console.error('Error fetching from Rainforest API:', error);
        // Fallback to cache if available even if expired? 
        // For now, just return empty or re-throw.
        // If we have stale cache, maybe better to return that?
        if (cached) {
            console.log(`[CACHE FALLBACK] Serving stale results due to error for: ${query}`);
            return cached.data;
        }
        return [];
    }
}

import { getAmazonAffiliateLink } from './affiliate';

// Helper to map Rainforest results
function mapRainforestResult(item: any): Product {

    const unitInfo = parseUnit(item.title);

    // Extract price (Rainforest returns price object or straight value sometimes depending on endpoint, usually object)
    let price = 0;
    if (item.price && item.price.value) {
        price = item.price.value;
    } else if (item.prices && item.prices.length > 0) {
        price = item.prices[0].value;
    }

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

    // Generate Affiliate Link
    let link = item.link;
    if (item.asin) {
        link = getAmazonAffiliateLink(item.asin);
    }

    return {
        id: item.asin || String(Math.random()),
        title: item.title,
        price: price,
        image: item.image || (item.images ? item.images[0] : ''),
        source: 'Amazon', // Always Amazon now
        rating: item.rating || 0,
        reviews: item.ratings_total || 0,
        unit: unit,
        amount: value,
        totalAmount: totalValue,
        pricePerUnit: pricePerUnit,
        link: link,
        currency: 'USD',
        originalPrice: 0,
        score: (totalValue > 0 && price > 0) ? (price / totalValue) : (price > 0 ? price : 999999),
        unitInfo: unitInfo || undefined
    };
}
