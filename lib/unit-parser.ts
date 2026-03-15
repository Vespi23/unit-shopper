export type UnitType = 'oz' | 'lb' | 'g' | 'kg' | 'mg' | 'l' | 'ml' | 'count' | 'fl oz' | 'gal' | 'qt' | 'pt' | 'loads' | 'rolls' | 'sheets' | 'sq ft' | 'unknown';

export interface UnitInfo {
    value: number;
    unit: UnitType;
    quantity: number;
    totalValue: number;
    formatted: string;
}

const UNIT_REGEX = {
    fl_oz: /(\d+(?:\.\d+)?)[-\s]?(?:fl\.?\s?oz\.?|fluid\s?ounces?|fl\.?\s?ounces?|fz|fl\.?\s?z\.?|f\.?\s?z\.?)\b/i,
    oz: /(\d+(?:\.\d+)?)[-\s]?(?:oz|ounce|ounces)\b/i,
    lb: /(\d+(?:\.\d+)?)[-\s]?(?:lb|lbs|pound|pounds)\b/i,
    g: /(\d+(?:\.\d+)?)[-\s]?(?:g|gram|grams)\b/i,
    kg: /(\d+(?:\.\d+)?)[-\s]?(?:kg|kilogram|kilograms)\b/i,
    mg: /(\d+(?:\.\d+)?)[-\s]?(?:mg|milligram|milligrams)\b/i,
    l: /(\d+(?:\.\d+)?)[-\s]?(?:l|liter|liters)\b/i,
    ml: /(\d+(?:\.\d+)?)[-\s]?(?:ml|milliliter|milliliters)\b/i,
    gal: /(\d+(?:\.\d+)?)[-\s]?(?:gal|gallon|gallons)\b/i,
    qt: /(\d+(?:\.\d+)?)[-\s]?(?:qt|quart|quarts)\b/i,
    pt: /(\d+(?:\.\d+)?)[-\s]?(?:pt|pint|pints)\b/i,
    sq_ft: /(\d+(?:\.\d+)?)[-\s]?(?:sq\s?ft|sq\.\s?ft|square\s?foot|square\s?feet)\b/i,
    loads: /(\d+)[-\s]?(?:load|loads)\b/i,
    rolls: /(\d+)[-\s]?(?:(?:mega|family|regular|double|triple|huge|super|giant|big|large|bulk)\s+){0,3}(?:roll|rolls)\b/i,
    sheets: /(\d+)[-\s]?(?:sheet|sheets)\b/i,
    // Reduce count aggressiveness to avoid hitting "4 Pack" as the primary value before a later "80 count".
    count: /(\d+(?:\.\d+)?)[-\s]?(?:counts?|ct|pcs|bars?|cups?|cans?|bottles?|boxes?|pouches?|dispensers?|patches|stickers|tissues?|wipes?|diapers?|pads?|pods?|capsules?|k-cups?)\b/i,
};

// Relax "pack" match constraints, ensuring we grab explicitly delimited packs rather than arbitrary strings.
const PACK_REGEX = /pack of (\d+)|(\d+)[-\s]?pack|\((?:pack of )?(\d+)[-\s]+(?:cans?|boxes?|bottles?|pouches?|packs?|counts?|rolls?|dispensers?|patches|stickers|ct|pods?|capsules?|k-cups?)\)/i;
const COUNT_AS_QUANTITY_REGEX = /(?:^|\s|,)(\d+)[-\s]?(?:counts?|ct|pcs|bars?|cups?|cans?|bottles?|boxes?|pouches?|dispensers?|patches|stickers|tissues?|wipes?|diapers?|pads?|pods?|capsules?|k-cups?)\b/i;
const MULTIPLIER_REGEX = /(\d+)\s?x\s?/i;

export function parseUnit(title: string): UnitInfo | null {
    // Cleanse title of dimensions like "60x40 mm" or "68 x 27 mm" to prevent the 
    // MULTIPLIER_REGEX from misinterpreting "68x" as a pack quantity.
    let cleanTitle = title.toLowerCase()
        .replace(/\b(\d+),(\d+)\b/g, '$1.$2') // Convert European comma decimals to periods (e.g., 8,5 -> 8.5)
        .replace(/\b\d+(?:\.\d+)?\s?x\s?\d+(?:\.\d+)?\s?(?:mm|cm|in|inch|inches|ft|foot|feet|m|meter|meters|yd|yard|yards)\b/g, '')
        .replace(/\b\d+(?:\.\d+)?\s?x[\)\s-]*(?:power|concentrated|concentration|strength|stronger|action|cleaning|ultra|advanced|max|tough|deep|clean|plus|oxy|stain|grease|odor|scent|formula|performance|boost|lasting|wash|magnification|zoom)\b/g, '')
        .replace(/\(\d+(?:\.\d+)?\s?x\)/g, '') // Also strip standalone "(20x)" style claims
        .replace(/\s\d+\s?sizes?/g, '') // Also remove "5 sizes" to prevent confusion
        .replace(/\b\d+(?:\.\d+)?[-\s]?servings?\b/g, '')
        .trim();

    const lowerTitle = cleanTitle;

    // 1. Detect Explicit TOTAL Overrides
    const explicitTotalMatch = lowerTitle.match(/\b(?:\d+.*)?total\s(?:of\s)?(\d+)\b|\b(\d+)\s?(?:total|in\s?total)\b/i);
    let explicitTotalValue: number | null = null;
    if (explicitTotalMatch) {
        const t = explicitTotalMatch[1] || explicitTotalMatch[2];
        if (t) explicitTotalValue = parseFloat(t);
    }

    // 2. Detect Standard Quantity (Pack of X, X Pack, Nx)
    let quantity = 1;
    let foundPackMultiplier = false;

    const packMatch = lowerTitle.match(PACK_REGEX);
    if (packMatch) {
        const q = packMatch[1] || packMatch[2] || packMatch[3];
        if (q) {
            quantity = parseInt(q, 10);
            foundPackMultiplier = true;
        }
    } else {
        // Try multiplier (e.g., 2x, 3x)
        const multMatch = lowerTitle.match(MULTIPLIER_REGEX);
        if (multMatch) {
            quantity = parseInt(multMatch[1], 10);
            foundPackMultiplier = true;
        }
    }

    // 3. Detect Unit & Value
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
                { key: 'sheets', type: 'sheets' },
                { key: 'rolls', type: 'rolls' }
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
                const potentialQuantity = parseInt(countMatch[1], 10);

                let isActuallyTotal = false;
                if (potentialQuantity > value && value >= 1) {
                    const ratio = potentialQuantity / value;
                    if (Number.isInteger(ratio) && ratio !== value && ratio !== potentialQuantity) {
                        if (new RegExp(`\\b${ratio}\\b`).test(lowerTitle)) {
                            isActuallyTotal = true;
                        }
                    }
                }

                if (!isActuallyTotal) {
                    quantity = potentialQuantity;
                }
            }
        }
    } else {
        // No unit found yet. Check if "count" IS the unit.
        // e.g. "100 count" -> 100 items.
        const match = lowerTitle.match(UNIT_REGEX.count);
        if (match) {
            value = parseFloat(match[1]);
            unit = 'count';
        } else if (lowerTitle.includes('pack')) {
            // "4 Pack" as fallback if 'pack' was removed from count regex
            const packValMatch = lowerTitle.match(/(\d+)[-\s]?pack/i);
            if (packValMatch && !foundPackMultiplier) {
                value = parseFloat(packValMatch[1]);
                unit = 'count';
            }
        }
    }

    // Paper Towel / Toilet Paper Edge Case: 
    // "Sheets" are often multiplied by "Count" or "Rolls" rather than a true explicit Pack.
    if ((unit === 'sheets' || unit === 'sq ft') && !foundPackMultiplier) {
        // Did we find a separate 'count' describing the rolls?
        const secondaryCountMatch = lowerTitle.match(UNIT_REGEX.count);
        if (secondaryCountMatch) {
            quantity = parseInt(secondaryCountMatch[1], 10);
        } else {
            const secondaryRollsMatch = lowerTitle.match(UNIT_REGEX.rolls);
            if (secondaryRollsMatch) {
                quantity = parseInt(secondaryRollsMatch[1], 10);
            }
        }
    }

    // 4. Standalone Multiplier Fallback check
    if (unit === 'unknown' && foundPackMultiplier && value <= 0 && quantity > 1) {
        // e.g. "24 Pack AA Batteries" -> Caught in PACK_REGEX, but no other explicit noun was detected.
        value = quantity;
        unit = 'count';
        quantity = 1;
    }

    if (unit === 'unknown' || value <= 0) return null;

    // Explicit Default Total check
    if (explicitTotalValue !== null) {
        // ONLY override if the explicit total seems plausible (e.g., 80 Total over 4 packs of 20 = 80... yes)
        value = explicitTotalValue;
        quantity = 1;
    }

    // 4. Overcounting Preventers. 
    // Double-counting implicit totals
    if ((unit === 'rolls' || unit === 'count' || unit === 'loads') && value === quantity && value > 2) {
        quantity = 1;
    }

    // Heuristic: If the title explicitly states "Total of 240 fl oz" or "240 count total",
    // the value matched is already the aggregate total. Multiplying it by the pack quantity
    // would result in double-counting (e.g., 240 * 12 = 2880).
    const isExplicitTotal = new RegExp(`total(?:\\s+of)?\\s+${value}|${value}\\s*[a-z\\s.]*\\s*total`, 'i').test(lowerTitle);

    let isImplicitTotal = false;
    if (quantity > 1 && value > 1) {
        const individualSize = value / quantity;
        if (Number.isInteger(individualSize) && individualSize !== value && individualSize !== quantity) {
            if (new RegExp(`\\b${individualSize}\\b`).test(lowerTitle)) {
                isImplicitTotal = true;
            }
        }
    }

    if ((isExplicitTotal || isImplicitTotal) && quantity > 1) {
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

    // Volume & Abstract Base: Milliliters (ml)
    const volumeToBase: Record<string, number> = {
        'ml': 1,
        'l': 1000,
        'fl oz': 29.5735,
        'gal': 3785.41,
        'qt': 946.353,
        'pt': 473.176,
        // Abstract Heuristics (Approximate Volume density equivalents)
        'loads': 29.5735 * 1.5, // 1 load ~= 1.5 fl oz
        'rolls': 1,             // Paper metric base
        'sheets': 1 / 300,      // 300 sheets ~= 1 roll
        'sq ft': 1 / 40,        // 40 sq ft ~= 1 roll
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
