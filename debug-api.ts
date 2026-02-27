import { searchProducts } from './lib/api-client';

async function test() {
    console.log("Searching for peanut butter...");
    try {
        const results = await searchProducts('peanut butter', 1);
        console.log(`Found ${results.length} results.`);
        if (results.length > 0) {
            console.log(results[0].title);
        }
    } catch (err) {
        console.error(err);
    }
}

test();
