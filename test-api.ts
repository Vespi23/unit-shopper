
// Mock of api-client logic (simplified)
const SERPAPI_KEY = "9fb185dcb75de3dc9f95698ccb8f996291411a12624e67b4839129d0601ac0b1";
const BASE_URL = 'https://serpapi.com/search.json';
const query = 'Tide';

async function verify() {
    console.log('Testing SERPAPI_KEY:', SERPAPI_KEY);
    if (!SERPAPI_KEY) {
        console.error('SERPAPI_KEY is missing');
        return;
    }

    const params = new URLSearchParams({
        engine: 'google_shopping',
        q: query,
        api_key: SERPAPI_KEY,
        google_domain: 'google.com',
        gl: 'us',
        hl: 'en',
        num: '5'
    });

    const url = `${BASE_URL}?${params.toString()}`;
    console.log('URL:', url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`SerpApi failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) {
            console.error('SerpApi Error:', data.error);
        } else {
            console.log('Success! Results found:', data.shopping_results?.length || 0);
            if (data.shopping_results && data.shopping_results.length > 0) {
                console.log('First result:', JSON.stringify(data.shopping_results[0], null, 2));
            }
        }

    } catch (error) {
        console.error('Error fetching from SerpApi:', error);
    }
}

verify();
