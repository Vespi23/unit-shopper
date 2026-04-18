import dotenv from 'dotenv';
import { searchProducts } from './lib/api-client';

dotenv.config({ path: '.env.development.local' });

async function verifyExactMatch() {
    console.log("Testing searchProducts with Exact Match system: 'toilet paper'");

    // FIX: Removed the '1'. The client now handles 5-7 pages in parallel automatically.
    const results = await searchProducts('toilet paper');

    let seatCoversFound = 0;

    for (const item of results) {
        if (/seat|cover/i.test(item.title)) {
            seatCoversFound++;
            console.log(`[STILL FOUND SEAT COVER] ${item.title}`);
        }
    }

    if (seatCoversFound === 0) {
        console.log(`✅ Success! 0 target accessories found in ${results.length} total results.`);
    } else {
        console.log(`❌ Failed: ${seatCoversFound} accessories slipped through despite quotes.`);
    }
}

verifyExactMatch();