import dotenv from 'dotenv';
import { searchProducts } from './lib/api-client';

dotenv.config({ path: '.env.development.local' });

async function verifyPurification() {
    console.log("Testing search query: 'toilet paper'");
    console.log("Expecting 0 matches for /seat|cover|holder/i \n");

    const results = await searchProducts('toilet paper', 1);

    let seatCoversFound = 0;

    for (const item of results) {
        if (/seat|cover|holder/i.test(item.title)) {
            seatCoversFound++;
            console.log(`[FAILED PURIFICATION] ${item.title}`);
        }
    }

    if (seatCoversFound === 0) {
        console.log(`✅ Success! 0 target accessories found in ${results.length} total results.`);
    } else {
        console.log(`❌ Failed: ${seatCoversFound} accessories slipped through.`);
    }
}

verifyPurification();
