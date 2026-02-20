import dotenv from 'dotenv';
import { searchProducts } from './lib/api-client';

dotenv.config({ path: '.env.development.local' });

async function debugLocalSearch() {
    console.log("Starting 20-page search for 'toilet paper'...");
    const results = await searchProducts('toilet paper', 1);
    console.log(`\n========= RESULTS =========`);
    console.log(`Total valid items after local mapping & filtering: ${results.length}`);

    // Check distribution of ratings
    const counts = {
        rating4plus: results.filter(p => (p.rating || 0) >= 4).length,
        ratingLow: results.filter(p => (p.rating || 0) < 4).length
    };
    console.log("Stats in final filtered pool:", counts);
}

debugLocalSearch();
