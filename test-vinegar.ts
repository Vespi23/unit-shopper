import { parseUnit } from './lib/unit-parser';

const title = "Belle Chemical 50% Pure Concentrated Vinegar - 12.5x Stronger - Indoor and Outdoor Cleaner (1 Gallon)";

console.log(JSON.stringify(parseUnit(title), null, 2));
