import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';

async function mapAndFilterTest() {
    console.log("Starting fetch for pages 1-20...");
    const pagesToFetch = Array.from({ length: 20 }, (_, i) => i + 1);

    const fetchPromises = pagesToFetch.map(async (pageNum) => {
        const params = new URLSearchParams({
            api_key: RAINFOREST_API_KEY!,
            type: 'search',
            amazon_domain: 'amazon.com',
            search_term: 'toilet paper',
            page: pageNum.toString()
        });

        const response = await fetch(`${BASE_URL}?${params.toString()}`);
        if (!response.ok) return 0;
        const data = await response.json();
        const count = data.search_results ? data.search_results.length : 0;
        console.log(`Page ${pageNum} returned ${count} items.`);
        return count;
    });

    await Promise.all(fetchPromises);
}

mapAndFilterTest();
