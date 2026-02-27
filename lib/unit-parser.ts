export type UnitType = 'oz' | 'lb' | 'g' | 'kg' | 'mg' | 'l' | 'ml' | 'count' | 'fl oz' | 'gal' | 'qt' | 'pt' | 'loads' | 'rolls' | 'sheets' | 'sq ft' | 'unknown';

export interface UnitInfo {
    value: number;
    unit: UnitType;
    quantity: number;
    totalValue: number;
    formatted: string;
}

const UNIT_REGEX = {
    fl_oz: /(\d+(?:\.\d+)?)\s?(?:fl\.?\s?oz\.?|fluid\s?ounces?|fl\.?\s?ounces?)\b/i,
    oz: /(\d+(?:\.\d+)?)\s?(?:oz|ounce|ounces)\b/i,
    lb: /(\d+(?:\.\d+)?)\s?(?:lb|lbs|pound|pounds)\b/i,
    g: /(\d+(?:\.\d+)?)\s?(?:g|gram|grams)\b/i,
    kg: /(\d+(?:\.\d+)?)\s?(?:kg|kilogram|kilograms)\b/i,
    mg: /(\d+(?:\.\d+)?)\s?(?:mg|milligram|milligrams)\b/i,
    l: /(\d+(?:\.\d+)?)\s?(?:l|liter|liters)\b/i,
    ml: /(\d+(?:\.\d+)?)\s?(?:ml|milliliter|milliliters)\b/i,
    gal: /(\d+(?:\.\d+)?)\s?(?:gal|gallon|gallons)\b/i,
    qt: /(\d+(?:\.\d+)?)\s?(?:qt|quart|quarts)\b/i,
    pt: /(\d+(?:\.\d+)?)\s?(?:pt|pint|pints)\b/i,
    sq_ft: /(\d+(?:\.\d+)?)\s?(?:sq\s?ft|sq\.\s?ft|square\s?foot|square\s?feet)\b/i,
    loads: /(\d+)\s?(?:load|loads)\b/i,
    rolls: /(\d+)\s?(?:(?:mega|family|regular|double|triple|huge|super|giant|big|large|bulk)\s+){0,3}(?:roll|rolls)\b/i,
    sheets: /(\d+)\s?(?:sheet|sheets)\b/i,
    count: /(\d+(?:\.\d+)?)\s?(?:count|ct|pack|pcs|bars?|cups?|cans?|bottles?|boxes?|pouches?)\b/i,
};

const PACK_REGEX = /pack of (\d+)|(\d+)[-\s]?pack|\((\d+)\s?(?:cans?|boxes?|bottles?|pouches?|packs?|count|rolls?)\)/i;
const COUNT_AS_QUANTITY_REGEX = /(?:^|\s|,)(\d+)\s?(?:count|ct|pcs|bars?|cups?|cans?|bottles?|boxes?|pouches?)\b/i;
const MULTIPLIER_REGEX = /(\d+)\s?x\s?/i;

export function parseUnit(title: string): UnitInfo | null {
    const lowerTitle = title.toLowerCase();

    // 1. Detect Standard Quantity (Pack of X, X Pack, Nx)
    let quantity = 1;
    const packMatch = lowerTitle.match(PACK_REGEX);
    if (packMatch) {
        const q = packMatch[1] || packMatch[2] || packMatch[3];
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

    // Heuristic: Mixed weight handling like "1 lb 4 oz" or "1.5 lbs 6 oz"
    const mixedWeightMatch = lowerTitle.match(/(\d+(?:\.\d+)?)\s?lbs?\s?(\d+(?:\.\d+)?)\s?oz/i);
    if (mixedWeightMatch) {
        const lbs = parseFloat(mixedWeightMatch[1]);
        const ozs = parseFloat(mixedWeightMatch[2]);
        value = (lbs * 16) + ozs;
        unit = 'oz';
    } else {
        // Heuristic: For certain items, "Count" is the preferred unit 
        // even if dimensions (like gallons) are present.
        const isCountableItem = /trash\s?bag|garbage\s?bag|paper\s?plate|wipe|diaper|tissue|napkin|swiffer|pods?|k-cup/i.test(lowerTitle);
        if (isCountableItem) {
            const countMatch = lowerTitle.match(UNIT_REGEX.count);
            if (countMatch) {
                value = parseFloat(countMatch[1]);
                unit = 'count';
            }
        }

        // If we didn't force a count unit, check weight/volume units
        if (unit === 'unknown') {
            const unitOrder: { key: keyof typeof UNIT_REGEX, type: UnitType }[] = [
                { key: 'fl_oz', type: 'fl oz' },
                { key: 'gal', type: 'gal' },
                { key: 'qt', type: 'qt' },
                { key: 'pt', type: 'pt' },
                { key: 'oz', type: 'oz' },
                { key: 'lb', type: 'lb' },
                { key: 'ml', type: 'ml' },
                { key: 'l', type: 'l' },
                { key: 'mg', type: 'mg' },
                { key: 'kg', type: 'kg' },
                { key: 'g', type: 'g' },
                { key: 'sq_ft', type: 'sq ft' },
                { key: 'loads', type: 'loads' },
                { key: 'rolls', type: 'rolls' },
                { key: 'sheets', type: 'sheets' }
            ];

            for (const u of unitOrder) {
                const match = lowerTitle.match(UNIT_REGEX[u.key]);
                if (match) {
                    value = parseFloat(match[1]);
                    unit = u.type;
                    break;
                }
            }
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

    // Handle SEO restatements (e.g., "24 Rolls, Pack of 24" or "24 Rolls, 24 Count")
    // If a discrete unit value exactly matches the package quantity, it is almost certainly redundant.
    // We restrict this to value > 2 to preserve legitimate "2-pack of 2" items.
    if ((unit === 'rolls' || unit === 'count' || unit === 'loads' || unit === 'sheets') && value === quantity && value > 2) {
        quantity = 1;
    }

    let totalValue = value * (quantity || 1);

    return {
        value,
        unit,
        quantity,
        totalValue,
        formatted: `${parseFloat(totalValue.toFixed(2))} ${unit === 'count' ? 'count' : unit}`
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
    // Heuristic Normalizations for Abstract Units
    // (To align algorithmic rank to realistic product density)
    else if (copy.unit === 'sheets') {
        copy.value /= 300; // 300 sheets ~= 1 roll
        copy.unit = 'rolls';
        copy.totalValue /= 300;
    } else if (copy.unit === 'sq ft') {
        copy.value /= 40; // 40 sq ft ~= 1 roll
        copy.unit = 'rolls';
        copy.totalValue /= 40;
    } else if (copy.unit === 'loads') {
        copy.value *= 1.5; // 1 load ~= 1.5 fl oz
        copy.unit = 'fl oz';
        copy.totalValue *= 1.5;
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

    // Weight Base: Grams (g)
    const weightToBase: Record<string, number> = {
        'g': 1,
        'kg': 1000,
        'mg': 0.001,
        'lb': 453.592,
        'oz': 28.3495,
    };

    // Volume Base: Milliliters (ml)
    const volumeToBase: Record<string, number> = {
        'ml': 1,
        'l': 1000,
        'fl oz': 29.5735,
        'gal': 3785.41,
        'qt': 946.353,
        'pt': 473.176,
    };

    if (weightToBase[from] && weightToBase[to]) {
        const valueInGrams = value * weightToBase[from];
        return valueInGrams / weightToBase[to];
    }

    if (volumeToBase[from] && volumeToBase[to]) {
        const valueInMl = value * volumeToBase[from];
        return valueInMl / volumeToBase[to];
    }

    // Direct Count Identity
    if (from === 'count' && to === 'count') return value;

    return null;
}
