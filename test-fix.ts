import { parseUnit } from './lib/unit-parser';

const tests = [
    "De Nigris Premium Organic White Wine Vinegar... 8,5 Oz (250ml)",
    "NONNA PIAS Chardonnay Vinegar, 8.45 FZ",
    "45% Pure Vinegar - Concentrated Industrial Grade (1-Gallon)",
    "Carandini Bianca Sweet White Vinegar, 8.45 FZ"
];

for (const title of tests) {
    console.log(`Title: ${title}`);
    console.log(parseUnit(title));
    console.log('---');
}
