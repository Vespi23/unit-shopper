export type UnitType = 'oz' | 'lb' | 'g' | 'kg' | 'l' | 'ml' | 'count' | 'fl oz' | 'loads' | 'rolls' | 'sheets' | 'unknown';

export interface UnitInfo {
    value: number;
    unit: UnitType;
    quantity: number;
    totalValue: number;
    formatted: string;
}

const UNIT_REGEX = {
    oz: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z]+\s+)?(?:oz|ounce|ounces)\b/i,
    fl_oz: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z]+\s+)?(?:fl\s?oz|fluid\s?ounce|fluid\s?ounces)\b/i,
    lb: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z]+\s+)?(?:lb|lbs|pound|pounds)\b/i,
    g: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z]+\s+)?(?:g|gram|rams)\b/i,
    kg: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z]+\s+)?(?:kg|kilogram|kilograms)\b/i,
    l: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z]+\s+)?(?:l|liter|liters)\b/i,
    ml: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z]+\s+)?(?:ml|milliliter|milliliters)\b/i,
    count: /(\d+)\s?(?:[a-zA-Z]+\s+)?(?:count|ct|pack|pcs)\b/i,
    loads: /(\d+)\s?(?:[a-zA-Z]+\s+)?(?:load|loads)\b/i,
    rolls: /(\d+)\s?(?:[a-zA-Z]+\s+)?(?:roll|rolls)\b/i,
    sheets: /(\d+)\s?(?:[a-zA-Z]+\s+)?(?:sheet|sheets)\b/i,
};

const PACK_REGEX = /pack of (\d+)|(\d+)[-\s]?pack/i;
const COUNT_AS_QUANTITY_REGEX = /(\d+)\s?(?:count|ct|pcs)/i;

export function parseUnit(title: string): UnitInfo | null {
    const lowerTitle = title.toLowerCase();

    // 1. Detect Standard Quantity (Pack of X, X Pack)
    let quantity = 1;
    const packMatch = lowerTitle.match(PACK_REGEX);
    if (packMatch) {
        const q = packMatch[1] || packMatch[2];
        if (q) quantity = parseInt(q, 10);
    }

    // 2. Detect Unit & Value
    let value = 0;
    let unit: UnitType = 'unknown';

    // Check weight/volume units first
    if (UNIT_REGEX.fl_oz.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.fl_oz);
        if (match) { value = parseFloat(match[1]); unit = 'fl oz'; }
    } else if (UNIT_REGEX.oz.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.oz);
        if (match) { value = parseFloat(match[1]); unit = 'oz'; }
    } else if (UNIT_REGEX.lb.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.lb);
        if (match) { value = parseFloat(match[1]); unit = 'lb'; }
    } else if (UNIT_REGEX.ml.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.ml);
        if (match) { value = parseFloat(match[1]); unit = 'ml'; }
    } else if (UNIT_REGEX.l.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.l);
        if (match) { value = parseFloat(match[1]); unit = 'l'; }
    } else if (UNIT_REGEX.g.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.g);
        if (match) { value = parseFloat(match[1]); unit = 'g'; }
    } else if (UNIT_REGEX.kg.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.kg);
        if (match) { value = parseFloat(match[1]); unit = 'kg'; }
    } else if (UNIT_REGEX.loads.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.loads);
        if (match) { value = parseFloat(match[1]); unit = 'loads'; }
    } else if (UNIT_REGEX.rolls.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.rolls);
        if (match) { value = parseFloat(match[1]); unit = 'rolls'; }
    } else if (UNIT_REGEX.sheets.test(lowerTitle)) {
        const match = lowerTitle.match(UNIT_REGEX.sheets);
        if (match) { value = parseFloat(match[1]); unit = 'sheets'; }
    }

    // 3. Handle 'count' behavior
    if (unit !== 'unknown') {
        // If we found a real unit (e.g. oz), then "count" usually means "quantity"
        // e.g. "20 count 1 oz bags" -> 20 * 1 oz = 20 oz
        if (quantity === 1) { // Only look for count-quantity if we haven't found a pack-quantity
            const countMatch = lowerTitle.match(COUNT_AS_QUANTITY_REGEX);
            if (countMatch) {
                quantity = parseInt(countMatch[1], 10);
            }
        }
    } else {
        // No unit found yet. Check if "count" IS the unit.
        // e.g. "100 count" -> 100 items.
        const match = lowerTitle.match(UNIT_REGEX.count);
        if (match) {
            value = parseFloat(match[1]);
            unit = 'count';
            // quantity remains as found by PACK_REGEX (e.g. "Pack of 2" -> 2).
            // If "100 count", PACK_REGEX didn't match, so quantity=1.
            // Total = 1 * 100 = 100 count. Correct.
        }
    }

    if (unit === 'unknown') return null;

    // Normalize Logic (Optional, can be separate)
    // For now, let's keep original unit but calculate total

    // Special handling for 'count'
    if (unit === 'count') {
        // If we detected `quantity` from "100 count" string as 100, 
        // and `value` from "100 count" as 100.
        // We should fix this. 
        // Heuristic: If we found a weight/volume, `quantity` applies to that.
        // If NO weight/volume found, checking `count`:
        // If "2 pack of 100 count", then Quantity=2, Value=100, Unit=count -> Total=200 count.
    }

    let totalValue = value * (quantity || 1);

    // Normalize formatting
    // e.g. 16 oz
    return {
        value,
        unit,
        quantity,
        totalValue,
        formatted: `${totalValue} ${unit}`
    };
}

export function normalizeUnit(info: UnitInfo): UnitInfo {
    // Convert everything to a base unit for comparison? 
    // oz/lb -> oz
    // g/kg -> g (or kg)
    // l/ml -> l (or ml)

    const copy = { ...info };

    if (copy.unit === 'lb') {
        copy.value *= 16;
        copy.unit = 'oz';
        copy.totalValue *= 16;
    } else if (copy.unit === 'fl oz') {
        // Treat fl oz as oz for now (or keep separate)
        // But many products mix them up (e.g. 16oz liquid)
        copy.unit = 'oz';
    } else if (copy.unit === 'kg') {
        copy.value *= 1000;
        copy.unit = 'g';
        copy.totalValue *= 1000;
    } else if (copy.unit === 'l') {
        copy.value *= 1000;
        copy.unit = 'ml';
        copy.totalValue *= 1000;
    }

    copy.formatted = `${parseFloat(copy.totalValue.toFixed(2))} ${copy.unit}`;
    return copy;
}

export function calculatePricePerUnit(price: number, totalValue: number, unit: string): string {
    if (!totalValue || totalValue === 0) return 'N/A';
    const ppu = price / totalValue;

    // Formatting: 
    // if unit is 'count', "$0.50/ea"
    // if unit is 'oz', "$0.50/oz"

    let unitLabel = unit;
    if (unit === 'count') unitLabel = 'ea';
    if (unit === 'loads') unitLabel = 'load';
    if (unit === 'rolls') unitLabel = 'roll';
    if (unit === 'sheets') unitLabel = 'sheet';

    return `$${ppu.toFixed(2)}/${unitLabel}`;
}
