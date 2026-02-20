import dotenv from 'dotenv';
import { searchProducts } from './lib/api-client';

dotenv.config({ path: '.env.development.local' });

async function verifyExactMatch() {
    console.log("Testing searchProducts with Exact Match system: 'toilet paper'");

    // We only need 1 page just to verify the exact-match wrapper didn't break the client
    const results = await searchProducts('toilet paper', 1);

    let seatCoversFound = 0;

    for (const item of results) {
        if (/seat|cover/i.test(item.title)) {
            seatCoversFound++;
            console.log(`[STILL FOUND SEAT COVER] ${item.title}`);
        }
    }

    if (seatCoversFound === 0) {
        console.log(`✅ Success! 0 target accessories found in ${results.length} total exact-matched results.`);
    } else {
        console.log(`❌ Failed: ${seatCoversFound} accessories slipped through despite quotes.`);
    }
}

verifyExactMatch();
