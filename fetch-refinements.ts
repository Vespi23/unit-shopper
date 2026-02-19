import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';

async function fetchRefinements() {
    const params = new URLSearchParams({
        api_key: RAINFOREST_API_KEY!,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: 'toilet paper',
        page: '1',
        sort_by: 'price_low_to_high',
        refinements: 'p_72/1248903011'
    });

    try {
        const response = await fetch(`${BASE_URL}?${params.toString()}`);
        const data = await response.json();
        if (data.search_results) {
            console.log("Top 5 results:");
            data.search_results.slice(0, 5).forEach((r: any, i: number) => {
                console.log(`${i + 1}. [${r.rating} stars] ${r.title.substring(0, 60)}... - $${r.price?.value}`);
            });
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

fetchRefinements();
