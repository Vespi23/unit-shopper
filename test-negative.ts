import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';

async function testNegativeKeyword() {
    const query = 'toilet paper -seat -covers -holder -cover';
    console.log(`Testing query: ${query}`);

    const params = new URLSearchParams({
        api_key: RAINFOREST_API_KEY!,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: query,
        page: '1',
        refinements: 'p_72/1248903011'
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.search_results) {
        let seatCovers = 0;
        for (const item of data.search_results) {
            const title = item.title.toLowerCase();
            if (title.includes('seat') || title.includes('cover')) {
                seatCovers++;
                console.log(`[FOUND SEAT COVER] ${item.title}`);
            }
        }
        console.log(`\nTotal Results: ${data.search_results.length}`);
        console.log(`Seat Covers Found: ${seatCovers}`);
    } else {
        console.log("No results or error:", data);
    }
}

testNegativeKeyword();
