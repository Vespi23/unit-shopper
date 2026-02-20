import { parseUnit, calculatePricePerUnit, normalizeUnit } from './lib/unit-parser';

const tests = [
    { title: "Amazon Aware 100% Bamboo 3-Ply Toilet Paper, Unscented, 24 Rolls, FSC Certified", price: 31.94 },
    { title: "Amazon Aware 100% Bamboo 3-Ply Toilet Paper, Unscented, 24 Rolls, Pack of 24", price: 31.94 },
    { title: "Amazon Aware 100% Bamboo 3-Ply Toilet Paper, Unscented, 24 Rolls, 24 Count", price: 31.94 },
    { title: "Bounty Paper Towels, 2 Double Rolls, Pack of 2", price: 5.99 },
    { title: "Sparkle Paper Towels, 6 Rolls, Pack of 4", price: 25.99 },
    { title: "12 Pack, 12 oz cans of Soda", price: 12.99 },
    { title: "Tide Laundry Detergent, 1 Gallon Heavy Duty", price: 14.99 },
    { title: "Tide Laundry Detergent, 100 Fl Oz Heavy Duty", price: 12.99 },
    { title: "Quilted Northern Toilet Paper, 1000 Sheets per Box", price: 9.99 },
    { title: "Tide Pods, 72 Loads of Detergent", price: 19.99 },
    { title: "Scott Toilet Paper, 80 sq ft bulk pack", price: 6.99 }
];

for (const t of tests) {
    const unitInfo = parseUnit(t.title);
    if (unitInfo) {
        const ppu = calculatePricePerUnit(t.price, unitInfo.totalValue, unitInfo.unit);
        const normalized = normalizeUnit(unitInfo);
        console.log(`\nTitle: ${t.title}`);
        console.log(`Price: $${t.price}`);
        console.log(`Parsed:    ${JSON.stringify(unitInfo)}`);
        console.log(`Normalized:${JSON.stringify(normalized)}`);
        console.log(`Score:     ${t.price / normalized.totalValue}`);
        console.log(`PPU (UI):  ${ppu}`);
    } else {
        console.log(`\nTitle: ${t.title}`);
        console.log(`Price: $${t.price}`);
        console.log(`Parsed: Null / Unknown`);
    }
}
