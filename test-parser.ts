import { parseUnit, calculatePricePerUnit } from './lib/unit-parser';

const tests = [
    { title: "Bounty Quick-Size Paper Towels, 8 Family Rolls = 20 Regular Rolls", price: 22.18 },
    { title: "Tide PODS Laundry Detergent Soap Pods, Spring Meadow, 112 count", price: 27.24 },
    { title: "Dove Beauty Bar Gentle Skin Cleanser Moisturizing for Gentle Soft Skin Care Original Washes Away Bacteria 3.75 oz, 14 Bars", price: 16.99 },
    { title: "Cottonelle Ultra Clean Toilet Paper, 24 Family Mega Rolls (24 = 132 regular rolls)", price: 26.68 },
    { title: "Mott's Applesauce, 4 Ounce Cup, 36 Count", price: 10.99 },
    { title: "Jack Link's Beef Jerky, Original, 0.625 Oz, 20 Count", price: 17.98 },
    { title: "Kirkland Signature Extra Fancy Unsalted Mixed Nuts, 2.5 Pound", price: 17.99 },
    { title: "Frito-Lay Fiesta Favorites Mix, Variety Pack (40 Count)", price: 19.99 },
    { title: "Amazon Basics 2-Ply Paper Towels, Flex-Sheets, 150 Sheets per Roll, 12 Rolls", price: 18.23 }
];

for (const t of tests) {
    const unitInfo = parseUnit(t.title);
    if (unitInfo) {
        const ppu = calculatePricePerUnit(t.price, unitInfo.totalValue, unitInfo.unit);
        console.log(`\nTitle: ${t.title}`);
        console.log(`Price: $${t.price}`);
        console.log(`Parsed: ${JSON.stringify(unitInfo)}`);
        console.log(`PPU: ${ppu}`);
    } else {
        console.log(`\nTitle: ${t.title}`);
        console.log(`Price: $${t.price}`);
        console.log(`Parsed: Null / Unknown`);
    }
}
