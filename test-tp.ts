import dotenv from 'dotenv';
import { parseUnit, normalizeUnit, calculatePricePerUnit } from './lib/unit-parser';

dotenv.config({ path: '.env.development.local' });

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';

async function mapAndFilterTest() {
    console.log("Starting fetch for pages 1-7 (Toilet Paper)...");
    const pagesToFetch = Array.from({ length: 7 }, (_, i) => i + 1);

    const fetchPromises = pagesToFetch.map(async (pageNum) => {
        const params = new URLSearchParams({
            api_key: RAINFOREST_API_KEY!,
            type: 'search',
            amazon_domain: 'amazon.com',
            search_term: 'toilet paper',
            page: pageNum.toString(),
            refinements: 'p_72/1248903011'
        });

        const response = await fetch(`${BASE_URL}?${params.toString()}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.search_results || [];
    });

    const rawResultsArrays = await Promise.all(fetchPromises);
    const rawResults = rawResultsArrays.flat().filter(r => r.rating >= 4);

    // Group by unit
    const byUnit: Record<string, { title: string, value: number, totalValue: number, score: number }[]> = {};

    for (const item of rawResults) {
        let price = 0;
        if (item.price && item.price.value) {
            price = item.price.value;
        } else if (item.prices && item.prices.length > 0) {
            price = item.prices[0].value;
        }

        const unitInfo = parseUnit(item.title);

        let score = 999999;
        let u = 'unknown';
        let totalVal = 0;
        let p = 0;

        if (unitInfo && price > 0) {
            const normalized = normalizeUnit(unitInfo);
            u = normalized.unit;
            totalVal = normalized.totalValue;
            p = normalized.value;
            if (normalized.totalValue > 0) {
                score = price / normalized.totalValue;
            }
        } else if (price > 0 && unitInfo) {
            score = price / unitInfo.totalValue;
            u = unitInfo.unit;
        }

        if (!byUnit[u]) byUnit[u] = [];
        byUnit[u].push({ title: item.title, value: p, totalValue: totalVal, score: score });
    }

    for (const u in byUnit) {
        console.log(`\n=== UNIT: ${u} (${byUnit[u].length} items) ===`);
        const sorted = byUnit[u].sort((a, b) => a.score - b.score);
        for (let i = 0; i < Math.min(6, sorted.length); i++) {
            const item = sorted[i];
            console.log(`- [Total: ${item.totalValue}] [Score: ${item.score.toFixed(4)}] ${item.title}`);
        }
    }
}

mapAndFilterTest();
