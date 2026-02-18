
// Test Rainforest API Product Details
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const BASE_URL = 'https://api.rainforestapi.com/request';
const ASIN = 'B0B9YVG4LR'; // Tide Pods from previous test

async function verify() {
    console.log('Testing Product Details for ASIN:', ASIN);

    if (!RAINFOREST_API_KEY) {
        console.error('RAINFOREST_API_KEY is missing');
        return;
    }

    const params = new URLSearchParams({
        api_key: RAINFOREST_API_KEY,
        type: 'product',
        amazon_domain: 'amazon.com',
        asin: ASIN
    });

    const url = `${BASE_URL}?${params.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API failed: ${response.status}`);

        const data = await response.json();

        console.log('Success!');
        console.log('Product Title:', data.product?.title);

        // Check for price history or similar fields
        if (data.product?.price_history) {
            console.log('Found Price History:', JSON.stringify(data.product.price_history, null, 2));
        } else {
            console.log('No price_history field found in product details.');
        }

        // Check for other potential sources
        console.log('Buybox Winner:', JSON.stringify(data.product?.buybox_winner, null, 2));
        console.log('Prices array:', JSON.stringify(data.product?.prices, null, 2));

    } catch (error) {
        console.error(error);
    }
}

verify();
