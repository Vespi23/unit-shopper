import { parseUnit, calculatePricePerUnit } from './lib/unit-parser';

const tests = [
    { title: "Amazon Aware 100% Bamboo 3-Ply Toilet Paper, Unscented, 24 Rolls, FSC Certified", price: 31.94 },
    { title: "Amazon Aware 100% Bamboo 3-Ply Toilet Paper, Unscented, 24 Rolls, Pack of 24", price: 31.94 },
    { title: "Amazon Aware 100% Bamboo 3-Ply Toilet Paper, Unscented, 24 Rolls, 24 Count", price: 31.94 },
    { title: "Bounty Paper Towels, 2 Double Rolls, Pack of 2", price: 5.99 },
    { title: "Sparkle Paper Towels, 6 Rolls, Pack of 4", price: 25.99 },
    { title: "12 Pack, 12 oz cans of Soda", price: 12.99 }
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
