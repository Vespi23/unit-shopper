import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';

async function testFetchCapacity() {
    console.log("Starting fetch for pages 1-50...");
    const pagesToFetch = Array.from({ length: 50 }, (_, i) => i + 1);
    let totalItems = 0;
    let failedPages = 0;

    // Process in batches of 5 to not overwhelm console immediately, simulating Promise.all
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
        if (!response.ok) {
            console.error(`Page ${pageNum} failed: ${response.status}`);
            failedPages++;
            return 0;
        }
        const data = await response.json();
        if (data.request_info && data.request_info.success === false) {
            console.error(`Page ${pageNum} error:`, data.request_info.message);
            failedPages++;
            return 0;
        }
        const count = data.search_results ? data.search_results.length : 0;
        console.log(`Page ${pageNum} returned ${count} items.`);
        return count;
    });

    const pageCounts = await Promise.all(fetchPromises);
    totalItems = pageCounts.reduce((acc, count) => acc + count, 0);
    console.log(`\n========= RESULTS =========`);
    console.log(`Total valid items retrieved: ${totalItems}`);
    console.log(`Total failed pages: ${failedPages}`);
}

testFetchCapacity();
