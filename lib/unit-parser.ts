export type UnitType = 'oz' | 'lb' | 'g' | 'kg' | 'mg' | 'l' | 'ml' | 'count' | 'fl oz' | 'gal' | 'qt' | 'pt' | 'loads' | 'rolls' | 'sheets' | 'sq ft' | 'unknown';

export interface UnitInfo {
    value: number;
    unit: UnitType;
    quantity: number;
    totalValue: number;
    formatted: string;
}

export const CANONICAL_UNITS: Record<string, string> = {
    'ounce': 'oz', 'ounces': 'oz', 'oz.': 'oz',
    'pound': 'lb', 'pounds': 'lb', 'lbs': 'lb', 'lb.': 'lb',
    'count': 'count', 'counts': 'count', 'ct': 'count', 'pcs': 'count', 'ea': 'count',
    'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz', 'fl. oz.': 'fl oz', 'fluid oz': 'fl oz',
    'gallon': 'gal', 'gallons': 'gal',
    'gram': 'g', 'grams': 'g',
    'milliliter': 'ml', 'milliliters': 'ml',
    'liter': 'l', 'liters': 'l'
};

export function toCanonicalUnit(unit: string): UnitType {
    if (!unit) return 'unknown';
    const lower = unit.toLowerCase().trim();
    return (CANONICAL_UNITS[lower] || lower) as UnitType;
}

const UNIT_REGEX = {
    fl_oz: /((?:\d*\.)?\d+)[-\s]?(?:fl\.?\s?oz\.?|fluid\s?ounces?|fl\.?\s?ounces?|fz|fl\.?\s?z\.?|f\.?\s?z\.?)\b/i,
    oz: /((?:\d*\.)?\d+)[-\s]?(?:oz|ounce|ounces)\b/i,
    lb: /((?:\d*\.)?\d+)[-\s]?(?:lb|lbs|pound|pounds)\b/i,
    g: /((?:\d*\.)?\d+)[-\s]?(?:g|gram|grams)\b/i,
    kg: /((?:\d*\.)?\d+)[-\s]?(?:kg|kilogram|kilograms)\b/i,
    mg: /((?:\d*\.)?\d+)[-\s]?(?:mg|milligram|milligrams)\b/i,
    l: /((?:\d*\.)?\d+)[-\s]?(?:l|liter|liters)\b/i,
    ml: /((?:\d*\.)?\d+)[-\s]?(?:ml|milliliter|milliliters)\b/i,
    gal: /((?:\d*\.)?\d+)[-\s]?(?:gal|gallon|gallons)\b/i,
    qt: /((?:\d*\.)?\d+)[-\s]?(?:qt|quart|quarts)\b/i,
    pt: /((?:\d*\.)?\d+)[-\s]?(?:pt|pint|pints)\b/i,
    sq_ft: /((?:\d*\.)?\d+)[-\s]?(?:sq\s?ft|sq\.\s?ft|square\s?foot|square\s?feet)\b/i,
    loads: /(\d+)[-\s]?(?:load|loads)\b/i,
    rolls: /(\d+)[-\s]?(?:(?:mega|family|regular|double|triple|huge|super|giant|big|large|bulk)\s+){0,3}(?:roll|rolls)\b/i,
    sheets: /(\d+)[-\s]?(?:sheet|sheets)\b/i,
    count: /((?:\d*\.)?\d+)[-\s]?(?:counts?|ct|pcs|bars?|cups?|cans?|bottles?|boxes?|pouches?|dispensers?|patches|stickers|tissues?|wipes?|diapers?|pads?|pods?|capsules?|k-cups?)\b/i,
};

const PACK_REGEX = /pack of (\d+)|(\d+)[-\s]?pack|\((?:pack of )?(\d+)[-\s]+(?:cans?|boxes?|bottles?|pouches?|packs?|counts?|rolls?|dispensers?|patches|stickers|ct|pods?|capsules?|k-cups?)\)/i;
const COUNT_AS_QUANTITY_REGEX = /(?:^|\s|,)(\d+)[-\s]?(?:counts?|ct|pcs|bars?|cups?|cans?|bottles?|boxes?|pouches?|dispensers?|patches|stickers|tissues?|wipes?|diapers?|pads?|pods?|capsules?|k-cups?)\b/i;
const MULTIPLIER_REGEX = /(\d+)\s?x\s?/i;

// Expanded to cover oatmeals, cereals, and standard dry-pantry portioned items
const TOTAL_WEIGHT_PRODUCT_THEMES = /\b(?:bar|bars|granola|snack|snacks|pouch|pouches|variety\s?pack|assortment|cereal|oat|oats|oatmeal|packet|packets|porridge|grits)\b/i;
const EXPLICIT_EACH_INDICATORS = /\b(?:each|per|bars\s+at|ea\.?|per\s+pouch|per\s+packet)\b/i;
const BULK_CONTAINER_INDICATORS = /\b(?:canister|canisters|tub|tubs|jar|jars|case|cases|pack\s+of\s+\d+\s+boxes)\b/i;

export function parseUnit(title: string): UnitInfo | null {
    let cleanTitle = title.toLowerCase();
    if (cleanTitle.includes(',')) cleanTitle = cleanTitle.replace(/\b(\d+),(\d+)\b/g, '$1.$2');
    if (cleanTitle.includes('x')) {
        cleanTitle = cleanTitle
            .replace(/\b\d+(?:\.\d+)?\s?x\s?\d+(?:\.\d+)?\s?(?:mm|cm|in|inch|inches|ft|foot|feet|m|meter|meters|yd|yard|yards)\b/g, '')
            .replace(/\b\d+(?:\.\d+)?\s?x[\)\s-]*(?:power|concentrated|concentration|strength|stronger|action|cleaning|ultra|advanced|max|tough|deep|clean|plus|oxy|stain|grease|odor|scent|formula|performance|boost|lasting|wash|magnification|zoom)\b/g, '')
            .replace(/\(\d+(?:\.\d+)?\s?x\)/g, '');
    }
    if (cleanTitle.includes('size')) cleanTitle = cleanTitle.replace(/\s\d+\s?sizes?/g, '');
    if (cleanTitle.includes('serving')) cleanTitle = cleanTitle.replace(/\b\d+(?:\.\d+)?[-\s]?servings?\b/g, '');

    cleanTitle = cleanTitle.trim();
    const lowerTitle = cleanTitle;

    const explicitTotalMatch = lowerTitle.match(/\b(?:\d+.*)?total\s(?:of\s)?(\d+(?:\.\d+)?)\b|\b(\d+(?:\.\d+)?)\s?(?:total|in\s?total|net\s?wt)\b/i);
    let explicitTotalValue: number | null = null;
    if (explicitTotalMatch) {
        const t = explicitTotalMatch[1] || explicitTotalMatch[2];
        if (t) explicitTotalValue = parseFloat(t);
    }

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
        const multMatch = lowerTitle.match(MULTIPLIER_REGEX);
        if (multMatch) {
            quantity = parseInt(multMatch[1], 10);
            foundPackMultiplier = true;
        }
    }

    let value = 0;
    let unit: UnitType = 'unknown';

    const mixedWeightMatch = lowerTitle.match(/(\d+(?:\.\d+)?)\s?lbs?\s?(\d+(?:\.\d+)?)\s?oz/i);
    if (mixedWeightMatch) {
        const lbs = parseFloat(mixedWeightMatch[1]);
        const ozs = parseFloat(mixedWeightMatch[2]);
        value = (lbs * 16) + ozs;
        unit = 'oz';
    } else {
        const isCountableItem = /trash\s?bag|garbage\s?bag|paper\s?plate|wipe|diaper|tissue|napkin|swiffer|pods?|k-cup/i.test(lowerTitle);
        if (isCountableItem) {
            const countMatch = lowerTitle.match(UNIT_REGEX.count);
            if (countMatch) {
                value = parseFloat(countMatch[1]);
                unit = 'count';
            }
        }
        if (unit === 'unknown') {
            const unitOrder: { key: keyof typeof UNIT_REGEX, type: UnitType }[] = [
                { key: 'fl_oz', type: 'fl oz' }, { key: 'gal', type: 'gal' }, { key: 'qt', type: 'qt' },
                { key: 'pt', type: 'pt' }, { key: 'oz', type: 'oz' }, { key: 'lb', type: 'lb' },
                { key: 'ml', type: 'ml' }, { key: 'l', type: 'l' }, { key: 'mg', type: 'mg' },
                { key: 'kg', type: 'kg' }, { key: 'g', type: 'g' }, { key: 'sq_ft', type: 'sq ft' },
                { key: 'loads', type: 'loads' }, { key: 'sheets', type: 'sheets' }, { key: 'rolls', type: 'rolls' }
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

    if (unit !== 'unknown' && unit !== 'count') {
        if (quantity === 1) {
            const countMatch = lowerTitle.match(COUNT_AS_QUANTITY_REGEX);
            if (countMatch) {
                const potentialQuantity = parseInt(countMatch[1], 10);
                let isActuallyTotal = false;
                if (potentialQuantity > value && value >= 1) {
                    const ratio = potentialQuantity / value;
                    if (Number.isInteger(ratio) && ratio !== value && ratio !== potentialQuantity) {
                        if (new RegExp(`\\b${ratio}\\b`).test(lowerTitle)) isActuallyTotal = true;
                    }
                }
                if (!isActuallyTotal) quantity = potentialQuantity;
            }
        }
    } else {
        const match = lowerTitle.match(UNIT_REGEX.count);
        if (match) {
            value = parseFloat(match[1]);
            unit = 'count';
        } else if (lowerTitle.includes('pack')) {
            const packValMatch = lowerTitle.match(/(\d+)[-\s]?pack/i);
            if (packValMatch && !foundPackMultiplier) {
                value = parseFloat(packValMatch[1]);
                unit = 'count';
            }
        }
    }

    if ((unit === 'sheets' || unit === 'sq ft') && !foundPackMultiplier) {
        const secondaryCountMatch = lowerTitle.match(UNIT_REGEX.count);
        if (secondaryCountMatch) quantity = parseInt(secondaryCountMatch[1], 10);
        else {
            const secondaryRollsMatch = lowerTitle.match(UNIT_REGEX.rolls);
            if (secondaryRollsMatch) quantity = parseInt(secondaryRollsMatch[1], 10);
        }
    }

    if (unit === 'unknown' && foundPackMultiplier && value <= 0 && quantity > 1) {
        value = quantity;
        unit = 'count';
        quantity = 1;
    }

    if (unit === 'unknown' || value <= 0) return null;
    if (explicitTotalValue !== null) { value = explicitTotalValue; quantity = 1; }
    if ((unit === 'rolls' || unit === 'count' || unit === 'loads') && value === quantity && value > 2) quantity = 1;

    const valueStr = value.toString();
    const isExplicitTotal = lowerTitle.includes(`total of ${valueStr}`) || 
                            lowerTitle.includes(`total ${valueStr}`) || 
                            lowerTitle.includes(`${valueStr} total`) ||
                            lowerTitle.includes(`net wt ${valueStr}`);

    let isImplicitTotal = false;
    if (quantity > 1 && value > 1) {
        const individualSize = value / quantity;
        if (Number.isInteger(individualSize) && individualSize !== value && individualSize !== quantity) {
            const sizeStr = individualSize.toString();
            if (lowerTitle.includes(sizeStr)) {
                const parts = lowerTitle.split(sizeStr);
                if (parts.length > 1) {
                    const charBefore = parts[0].slice(-1);
                    const charAfter = parts[1].charAt(0);
                    const isStandalone = (!charBefore || /[\s\-(]/.test(charBefore)) && 
                                         (!charAfter || /[\s\-)]/.test(charAfter));
                    if (isStandalone) isImplicitTotal = true;
                }
            }
        }
    }

    // Advanced Pantry Safeguard: Handles Oatmeal pouch/packet count double-multiplication bugs
    if (quantity > 1 && (unit === 'oz' || unit === 'g' || unit === 'fl oz')) {
        const isPackageTotalTheme = TOTAL_WEIGHT_PRODUCT_THEMES.test(lowerTitle);
        const hasEachMarker = EXPLICIT_EACH_INDICATORS.test(lowerTitle);
        const isBulkContainer = BULK_CONTAINER_INDICATORS.test(lowerTitle);

        // If it matches a pantry archetype, lacks an explicit per-unit label, and is not a genuine pack of massive canisters
        if (isPackageTotalTheme && !hasEachMarker && !isBulkContainer) {
            isImplicitTotal = true;
        }
    }

    if ((isExplicitTotal || isImplicitTotal) && quantity > 1) quantity = 1;

    let totalValue = value * (quantity || 1);
    return {
        value, unit, quantity, totalValue,
        formatted: `${parseFloat(totalValue.toFixed(2))} ${unit === 'count' ? 'count' : unit}`
    };
}

export function normalizeUnit(info: UnitInfo): UnitInfo {
    const copy = { ...info };
    if (copy.unit === 'lb') { copy.value *= 16; copy.unit = 'oz'; copy.totalValue *= 16; }
    else if (copy.unit === 'kg') { copy.value *= 35.274; copy.unit = 'oz'; copy.totalValue *= 35.274; }
    else if (copy.unit === 'g') { copy.value *= 0.035274; copy.unit = 'oz'; copy.totalValue *= 0.035274; }
    else if (copy.unit === 'mg') { copy.value *= 0.000035274; copy.unit = 'oz'; copy.totalValue *= 0.000035274; }
    else if (copy.unit === 'gal') { copy.value *= 128; copy.unit = 'fl oz'; copy.totalValue *= 128; }
    else if (copy.unit === 'qt') { copy.value *= 32; copy.unit = 'fl oz'; copy.totalValue *= 32; }
    else if (copy.unit === 'pt') { copy.value *= 16; copy.unit = 'fl oz'; copy.totalValue *= 16; }
    else if (copy.unit === 'l') { copy.value *= 33.814; copy.unit = 'fl oz'; copy.totalValue *= 33.814; }
    else if (copy.unit === 'ml') { copy.value *= 0.033814; copy.unit = 'fl oz'; copy.totalValue *= 0.033814; }
    else if (copy.unit === 'sheets') {
        const isPaperTowel = /towel|napkin/i.test(info.formatted); 
        const divisor = isPaperTowel ? 100 : 300; 
        copy.value /= divisor; copy.unit = 'rolls'; copy.totalValue /= divisor;
    } else if (copy.unit === 'sq ft') {
        copy.value /= 40; copy.unit = 'rolls'; copy.totalValue /= 40;
    } else if (copy.unit === 'loads') {
        copy.value *= 1.5; copy.unit = 'fl oz'; copy.totalValue *= 1.5;
    }
    copy.formatted = `${parseFloat(copy.totalValue.toFixed(2))} ${copy.unit}`;
    return copy;
}

export function calculatePricePerUnit(price: number, totalValue: number, unit: string): string {
    if (!totalValue || totalValue === 0) return 'N/A';
    const ppu = price / totalValue;
    const standardized = toCanonicalUnit(unit);
    let unitLabel = standardized === 'unknown' ? unit : standardized;
    if (standardized === 'count') unitLabel = 'ea';
    if (standardized === 'loads') unitLabel = 'load';
    if (standardized === 'rolls') unitLabel = 'roll';
    if (standardized === 'sheets') unitLabel = 'sheet';
    if (standardized === 'sq ft') unitLabel = 'sq ft';
    if (standardized === 'fl oz') unitLabel = 'fl oz';
    return `$${ppu.toFixed(2)}/${unitLabel}`;
}

export function convertValue(value: number, from: string, to: string): number | null {
    const cFrom = toCanonicalUnit(from);
    const cTo = toCanonicalUnit(to);
    if (cFrom === cTo) return value;
    if (value <= 0) return null;
    const weightToBase: Record<string, number> = { 'g': 1, 'kg': 1000, 'mg': 0.001, 'lb': 453.592, 'oz': 28.3495 };
    const volumeToBase: Record<string, number> = {
        'ml': 1, 'l': 1000, 'fl oz': 29.5735, 'gal': 3785.41, 'qt': 946.353, 'pt': 473.176,
        'loads': 29.5735 * 1.5, 'rolls': 1, 'sheets': 1 / 300, 'sq ft': 1 / 40,
    };
    if (weightToBase[cFrom] && weightToBase[cTo]) return (value * weightToBase[cFrom]) / weightToBase[cTo];
    if (volumeToBase[cFrom] && volumeToBase[cTo]) return (value * volumeToBase[cFrom]) / volumeToBase[cTo];
    if (cFrom === 'count' && cTo === 'count') return value;
    return null;
}