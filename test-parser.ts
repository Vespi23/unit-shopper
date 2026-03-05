import { parseUnit as originalParseUnit } from './lib/unit-parser.ts';

function parseUnit(title: string) {
    const cleanTitle = title.toLowerCase()
        .replace(/\b\d+(?:\.\d+)?\s?x\s?\d+(?:\.\d+)?\s?(?:mm|cm|in|inch|inches|ft|foot|feet|m|meter|meters|yd|yard|yards)\b/g, '')
        .trim();

    return originalParseUnit(cleanTitle);
}

const titles = [
    "AmazonCommercial FSC Certified Ultra Plus Universal Multifold Paper Towels, 2400 Count, 16 Packs of 150",
    "Amazon Aware Bamboo Paper Towels, 6 Rolls, 2 ply, FSC Certified, 150 Sheets, 900 Count"
];

for (const t of titles) {
    console.log("-------------------");
    console.log("Original: " + t);
    console.log("Result:");
    console.log(parseUnit(t));
}
