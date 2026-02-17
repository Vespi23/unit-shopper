import { Product } from './types';
import { parseUnit, calculatePricePerUnit } from './unit-parser';

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const BASE_URL = 'https://serpapi.com/search.json';

interface SerpApiResult {
    position: number;
    title: string;
    link: string;
    product_link: string;
    product_id: string;
    serpapi_product_api: string;
    source: string;
    price: string;
    extracted_price: number;
    thumbnail: string;
    delivery: string;
}

export async function searchProducts(query: string, engine: 'google_shopping' | 'amazon' = 'amazon'): Promise<Product[]> {
    if (!SERPAPI_KEY) {
        console.warn('SERPAPI_KEY is missing, returning empty array');
        return [];
    }

    const params = new URLSearchParams({
        engine: engine,
        q: query,
        api_key: SERPAPI_KEY,
        // Common params
        hl: 'en',
        gl: 'us',
        num: '50',
        no_cache: 'true'
    });

    if (engine === 'google_shopping') {
        params.append('google_domain', 'google.com');
    }

    try {
        const response = await fetch(`${BASE_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`SerpApi failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            console.error('SerpApi Error:', data.error);
            return [];
        }

        let results: any[] = [];

        if (engine === 'google_shopping') {
            results = data.shopping_results || [];
            return results.map(item => mapGoogleResult(item));
        } else if (engine === 'amazon') {
            results = data.organic_results || []; // Amazon uses 'organic_results'
            return results.map(item => mapAmazonResult(item));
        }

        return [];

    } catch (error) {
        console.error('Error fetching from SerpApi:', error);
        return [];
    }
}

// Helper to map Google Shopping results
function mapGoogleResult(item: any): Product {
    const { parseUnit, calculatePricePerUnit } = require('./unit-parser'); // Lazy load to avoid circular deps if any
    const unitInfo = parseUnit(item.title);
    const price = item.extracted_price || 0;

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

    return {
        id: item.product_id || String(Math.random()),
        title: item.title,
        price: price,
        image: item.thumbnail,
        source: item.source || 'Google Shopping',
        rating: item.rating,
        reviews: item.reviews,
        unit: unit,
        amount: value,
        totalAmount: totalValue,
        pricePerUnit: pricePerUnit,
        link: item.link || item.product_link,
        currency: 'USD',
        originalPrice: 0,
        score: (totalValue > 0 && price > 0) ? (price / totalValue) : (price > 0 ? price : 999999)
    };
}

// Helper to map Amazon results
function mapAmazonResult(item: any): Product {
    const { parseUnit, calculatePricePerUnit } = require('./unit-parser');
    const { getAmazonAffiliateLink } = require('./affiliate');

    const unitInfo = parseUnit(item.title);
    const price = item.price || item.extracted_price || 0; // Amazon result might have slightly different price field

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

    // Generate Affiliate Link if ASIN exists
    let link = item.link;
    if (item.asin) {
        link = getAmazonAffiliateLink(item.asin);
    }

    return {
        id: item.asin || String(Math.random()),
        title: item.title,
        price: price,
        image: item.thumbnail,
        source: 'Amazon',
        rating: item.rating,
        reviews: item.reviews,
        unit: unit,
        amount: value,
        totalAmount: totalValue,
        pricePerUnit: pricePerUnit,
        link: link,
        currency: 'USD',
        originalPrice: 0, // Could parse 'original_price' if available
        score: (totalValue > 0 && price > 0) ? (price / totalValue) : (price > 0 ? price : 999999)
    };
}
