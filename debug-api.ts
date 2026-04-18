import { searchProducts } from './lib/api-client';

async function test() {
    console.log("Searching for peanut butter...");
    try {
        // Removed the '1' to match the new (query: string, targetUnit?: string) signature
        const results = await searchProducts('peanut butter'); 
        
        console.log(`Found ${results.length} results.`);
        if (results.length > 0) {
            console.log("Top Result:", results[0].title);
            console.log("Price per unit:", results[0].pricePerUnit);
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
}

test();