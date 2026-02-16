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

export async function searchProducts(query: string): Promise<Product[]> {
    if (!SERPAPI_KEY) {
        console.warn('SERPAPI_KEY is missing, returning empty array');
        return [];
    }

    const params = new URLSearchParams({
        engine: 'google_shopping',
        q: query,
        api_key: SERPAPI_KEY,
        google_domain: 'google.com',
        gl: 'us',
        hl: 'en',
        num: '20' // Fetch 20 results
    });

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

        const results: SerpApiResult[] = data.shopping_results || [];

        return results.map(item => {
            // Parse unit info (this is our secret sauce)
            const unitInfo = parseUnit(item.title);
            const price = item.extracted_price || 0;

            let pricePerUnit = 'N/A';
            let unit: any = 'unknown'; // strictly type this if possible, but 'any' or string avoids the UnitType mismatch for now
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
                source: item.source || 'Unknown',
                rating: 4.5,
                reviews: 0,
                unit: unit,
                amount: value,
                totalAmount: totalValue,
                pricePerUnit: pricePerUnit,
                link: item.link,
                currency: 'USD',
                originalPrice: 0,
                score: (totalValue > 0 && price > 0) ? (price / totalValue) : (price > 0 ? price : 999999)
            };
        });

    } catch (error) {
        console.error('Error fetching from SerpApi:', error);
        return [];
    }
}
