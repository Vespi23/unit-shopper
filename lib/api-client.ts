import 'server-only';
import { Product } from './types';
import { parseUnit, calculatePricePerUnit } from './unit-parser';

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';

export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {
    if (!RAINFOREST_API_KEY) {
        console.warn('RAINFOREST_API_KEY is missing');
        return [];
    }

    const params = new URLSearchParams({
        api_key: RAINFOREST_API_KEY,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: query,
        page: page.toString(),
        sort_by: 'featured' // Default sort
    });

    try {
        console.log(`Fetching Rainforest API for: ${query}, page: ${page}`);
        const response = await fetch(`${BASE_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Rainforest API failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.request_info && data.request_info.success === false) {
            console.error('Rainforest API Error:', data.request_info.message);
            return [];
        }

        const results = data.search_results || [];
        return results.map((item: any) => mapRainforestResult(item));

    } catch (error) {
        console.error('Error fetching from Rainforest API:', error);
        return [];
    }
}

// Helper to map Rainforest results
function mapRainforestResult(item: any): Product {
    const { getAmazonAffiliateLink } = require('./affiliate');

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
