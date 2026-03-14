import { parseUnit } from './lib/unit-parser';

const furtherTests = [
    // 1. Standalone "Pack" issue (identified previously as N/A)
    "Amazon Basics 24 Pack AA High-Performance Alkaline Batteries",
    "Energizer Max AA Batteries, 48 Pack",
    // 2. Liquid multi-packs
    "LaCroix Sparkling Water, Lemon, 12 Fl Oz (Pack of 8)",
    "Monster Energy Drink, Green, 16 Ounce (Pack of 24)",
    // 3. Multi-dimensional units + Explicit x multiplier
    "Fancy Feast Wet Cat Food, 3 oz Cans, 24 Count",
    "Purina Friskies Canned Wet Cat Food 40 x 5.5 oz. Cans",
    // 4. "Per" wording
    "Kleenex Trusted Care Everyday Facial Tissues, 160 Tissues per Box, 6 flat boxes",
    // 5. Mixed paper formulas
    "Bounty Select-a-Size Paper Towels, 6 Double Rolls = 12 Regular Rolls",
    "Cottonelle Ultra Clean Toilet Paper, 12 Mega Rolls = 48 Regular Rolls, 340 Sheets Per Roll",
    // 6. Confusing explicit packs
    "Scotch-Brite Heavy Duty Scrub Sponges, 6 Count (Pack of 2), 12 Total",
];

for (const title of furtherTests) {
    console.log(`\nTitle: ${title}`);
    const res = parseUnit(title);
    if (res) {
        console.log(`Parsed: ${res.value} ${res.unit} x ${res.quantity} (Total: ${res.totalValue})`);
    } else {
        console.log(`Parsed: N/A`);
    }
}
