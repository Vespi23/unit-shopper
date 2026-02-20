import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';

async function testExactMatch() {
    const query = '"toilet paper"'; // Wrapping in quotes just like Google
    console.log(`Testing exact match query: ${query}`);

    const params = new URLSearchParams({
        api_key: RAINFOREST_API_KEY!,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: query,
        page: '1',
        refinements: 'p_72/1248903011' // Keep our 4-star filter
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.search_results) {
        let seatCovers = 0;
        for (let i = 0; i < Math.min(10, data.search_results.length); i++) {
            const item = data.search_results[i];
            const title = item.title.toLowerCase();
            console.log(`- ${item.title}`);
            if (title.includes('seat') || title.includes('cover')) {
                seatCovers++;
            }
        }
        console.log(`\nTotal First Page Results: ${data.search_results.length}`);
        console.log(`Seat Covers Found in Top 10: ${seatCovers}`);
    } else {
        console.log("No results or error:", data);
    }
}

testExactMatch();
