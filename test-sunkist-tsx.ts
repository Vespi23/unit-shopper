import { parseUnit } from './lib/unit-parser';

const title = 'Sunkist Orange Zero (Diet) Soda 20 oz Bottles (Pack of 10, Total of 200 Fl Oz)';
const info = parseUnit(title);
console.log("TSX Output:", JSON.stringify(info, null, 2));
