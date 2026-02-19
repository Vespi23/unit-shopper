export type UnitType = 'oz' | 'lb' | 'g' | 'kg' | 'mg' | 'l' | 'ml' | 'count' | 'fl oz' | 'gal' | 'qt' | 'pt' | 'loads' | 'rolls' | 'sheets' | 'sq ft' | 'unknown';

export interface UnitInfo {
    value: number;
    unit: UnitType;
    quantity: number;
    totalValue: number;
    formatted: string;
}

const UNIT_REGEX = {
    oz: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:oz|ounce|ounces)\b/i,
    fl_oz: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:fl\s?oz|fluid\s?ounce|fluid\s?ounces)\b/i,
    lb: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:lb|lbs|pound|pounds)\b/i,
    g: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:g|gram|grams)\b/i,
    kg: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:kg|kilogram|kilograms)\b/i,
    mg: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:mg|milligram|milligrams)\b/i,
    l: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:l|liter|liters)\b/i,
    ml: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:ml|milliliter|milliliters)\b/i,
    gal: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:gal|gallon|gallons)\b/i,
    qt: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:qt|quart|quarts)\b/i,
    pt: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:pt|pint|pints)\b/i,
    count: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:count|ct|pack|pcs)\b/i,
    loads: /(\d+)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:load|loads)\b/i,
    rolls: /(\d+)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:roll|rolls)\b/i,
    sheets: /(\d+)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:sheet|sheets)\b/i,
    sq_ft: /(\d+(?:\.\d+)?)\s?(?:[a-zA-Z\.]+\s+){0,3}(?:sq\s?ft|sq\.\s?ft|square\s?foot|square\s?feet)\b/i,
};

const PACK_REGEX = /pack of (\d+)|(\d+)[-\s]?pack/i;
const COUNT_AS_QUANTITY_REGEX = /(\d+)\s?(?:count|ct|pcs)/i;
const MULTIPLIER_REGEX = /(\d+)\s?x\s?/i;

export function parseUnit(title: string): UnitInfo | null {
    const lowerTitle = title.toLowerCase();

    // 1. Detect Standard Quantity (Pack of X, X Pack, Nx)
    let quantity = 1;
    const packMatch = lowerTitle.match(PACK_REGEX);
    if (packMatch) {
        const q = packMatch[1] || packMatch[2];
        if (q) quantity = parseInt(q, 10);
    } else {
        // Try multiplier (e.g., 2x, 3x)
        const multMatch = lowerTitle.match(MULTIPLIER_REGEX);
        if (multMatch) {
            quantity = parseInt(multMatch[1], 10);
        }
    }

    // 2. Detect Unit & Value
    let value = 0;
    let unit: UnitType = 'unknown';

    // Heuristic: For certain items (bags, wipes, etc.), "Count" is the preferred unit 
    // even if dimensions (like gallons) are present.
    const isCountableItem = /trash|bag|plate|cup|wipe|diaper|tissue|napkin|swiffer/i.test(lowerTitle);
    if (isCountableItem) {
        const countMatch = lowerTitle.match(UNIT_REGEX.count);
        if (countMatch) {
            value = parseFloat(countMatch[1]);
            unit = 'count';
        }
    }

    // If we didn't force a count unit, check weight/volume units
    if (unit === 'unknown') {
        if (UNIT_REGEX.fl_oz.test(lowerTitle)) {
            const match = lowerTitle.match(UNIT_REGEX.fl_oz);
            if (match) { value = parseFloat(match[1]); unit = 'fl oz'; }
        } else if (UNIT_REGEX.gal.test(lowerTitle)) {
            const match = lowerTitle.match(UNIT_REGEX.gal);
            if (match) { value = parseFloat(match[1]); unit = 'gal'; }
        } else if (UNIT_REGEX.qt.test(lowerTitle)) {
            const match = lowerTitle.match(UNIT_REGEX.qt);
            if (match) { value = parseFloat(match[1]); unit = 'qt'; }
        } else if (UNIT_REGEX.pt.test(lowerTitle)) {
            const match = lowerTitle.match(UNIT_REGEX.pt);
            if (match) { value = parseFloat(match[1]); unit = 'pt'; }
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
        } else if (UNIT_REGEX.mg.test(lowerTitle)) {
            const match = lowerTitle.match(UNIT_REGEX.mg);
            if (match) { value = parseFloat(match[1]); unit = 'mg'; }
        } else if (UNIT_REGEX.g.test(lowerTitle)) {
            const match = lowerTitle.match(UNIT_REGEX.g);
            if (match) { value = parseFloat(match[1]); unit = 'g'; }
        } else if (UNIT_REGEX.kg.test(lowerTitle)) {
            const match = lowerTitle.match(UNIT_REGEX.kg);
            if (match) { value = parseFloat(match[1]); unit = 'kg'; }
        } else if (UNIT_REGEX.sq_ft.test(lowerTitle)) {
            const match = lowerTitle.match(UNIT_REGEX.sq_ft);
            if (match) { value = parseFloat(match[1]); unit = 'sq ft'; }
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
    }

    // 3. Handle 'count' behavior
    if (unit !== 'unknown' && unit !== 'count') {
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
        }
    }

    if (unit === 'unknown') return null;

    let totalValue = value * (quantity || 1);

    return {
        value,
        unit,
        quantity,
        totalValue,
        formatted: `${totalValue} ${unit}`
    };
}

export function normalizeUnit(info: UnitInfo): UnitInfo {
    const copy = { ...info };

    if (copy.unit === 'lb') {
        copy.value *= 16;
        copy.unit = 'oz';
        copy.totalValue *= 16;
    } else if (copy.unit === 'gal') {
        copy.value *= 128;
        copy.unit = 'fl oz';
        copy.totalValue *= 128;
    } else if (copy.unit === 'qt') {
        copy.value *= 32;
        copy.unit = 'fl oz';
        copy.totalValue *= 32;
    } else if (copy.unit === 'pt') {
        copy.value *= 16;
        copy.unit = 'fl oz';
        copy.totalValue *= 16;
    } else if (copy.unit === 'fl oz') {
        copy.unit = 'oz'; // Normalizing fluid ounce to ounce for simplicity in UI if desired, or keep as fl oz.
        // For consistent pricing, let's keep it simple: Everything fluid -> fl oz.
        copy.unit = 'fl oz';
    } else if (copy.unit === 'kg') {
        copy.value *= 1000;
        copy.unit = 'g';
        copy.totalValue *= 1000;
    } else if (copy.unit === 'mg') {
        copy.value /= 1000;
        copy.unit = 'g';
        copy.totalValue /= 1000;
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

    let unitLabel = unit;
    if (unit === 'count') unitLabel = 'ea';
    if (unit === 'loads') unitLabel = 'load';
    if (unit === 'rolls') unitLabel = 'roll';
    if (unit === 'sheets') unitLabel = 'sheet';
    if (unit === 'sq ft') unitLabel = 'sq ft';
    if (unit === 'fl oz') unitLabel = 'fl oz';

    return `$${ppu.toFixed(2)}/${unitLabel}`;
}

export function convertValue(value: number, from: UnitType, to: UnitType): number | null {
    if (from === to) return value;
    if (value <= 0) return null;

    // Weight
    if (from === 'lb' && to === 'oz') return value * 16;
    if (from === 'oz' && to === 'lb') return value / 16;
    if (from === 'kg' && to === 'g') return value * 1000;
    if (from === 'g' && to === 'kg') return value / 1000;
    if (from === 'mg' && to === 'g') return value / 1000;
    if (from === 'g' && to === 'mg') return value * 1000;
    if (from === 'kg' && to === 'lb') return value * 2.20462;
    if (from === 'lb' && to === 'kg') return value / 2.20462;
    if (from === 'g' && to === 'oz') return value * 0.035274;
    if (from === 'oz' && to === 'g') return value / 0.035274;
    if (from === 'kg' && to === 'oz') return value * 35.274;
    if (from === 'oz' && to === 'kg') return value / 35.274;

    // Volume
    if (from === 'gal' && to === 'fl oz') return value * 128;
    if (from === 'fl oz' && to === 'gal') return value / 128;
    if (from === 'qt' && to === 'fl oz') return value * 32;
    if (from === 'fl oz' && to === 'qt') return value / 32;
    if (from === 'pt' && to === 'fl oz') return value * 16;
    if (from === 'fl oz' && to === 'pt') return value / 16;
    if (from === 'l' && to === 'ml') return value * 1000;
    if (from === 'ml' && to === 'l') return value / 1000;

    // Volume Imperial <-> Metric (Approx)
    if (from === 'l' && to === 'fl oz') return value * 33.814;
    if (from === 'fl oz' && to === 'l') return value / 33.814;
    if (from === 'ml' && to === 'fl oz') return value * 0.033814;
    if (from === 'fl oz' && to === 'ml') return value / 0.033814;

    // Direct Count Identity
    if (from === 'count' && to === 'count') return value;

    return null;
}
