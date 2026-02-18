
// Test Rainforest API
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';
const query = 'Tide Pods';

import { parseUnit } from './lib/unit-parser';

async function verify() {
    console.log('Testing query:', query);

    if (!RAINFOREST_API_KEY) {
        console.error('RAINFOREST_API_KEY is missing');
        return;
    }

    const params = new URLSearchParams({
        api_key: RAINFOREST_API_KEY,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: query
    });

    const url = `${BASE_URL}?${params.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API failed: ${response.status}`);

        const data = await response.json();
        const results = data.search_results || [];

        console.log(`Found ${results.length} results.`);

        results.slice(0, 5).forEach((item: any, index: number) => {
            console.log(`\n--- Item ${index + 1} ---`);
            console.log(JSON.stringify(item, null, 2));

            const parsed = parseUnit(item.title);
            console.log('Local Parsed Unit:', parsed ? JSON.stringify(parsed) : 'NULL (Failed to parse)');
        });

    } catch (error) {
        console.error(error);
    }
}

verify();
