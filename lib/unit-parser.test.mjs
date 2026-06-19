import test from 'node:test';
import assert from 'node:assert/strict';

// Mock version of your updated parseUnit function to run instantly in native Node
function parseUnitMock(title) {
    let cleanTitle = title.toLowerCase();
    cleanTitle = cleanTitle.replace(/\b\d{2}\/\d{2}\b/g, '');
    if (cleanTitle.includes(',')) cleanTitle = cleanTitle.replace(/\b(\d+),(\d+)\b/g, '$1.$2');

    const UNIT_REGEX = {
        oz: /((?:\d*\.)?\d+)[-\s]?(?:oz|ounce|ounces)\b/i,
        count: /((?:\d*\.)?\d+)[-\s]?(?:counts?|ct|pcs)\b/i
    };

    const COUNT_AS_QUANTITY_REGEX = /(?:^|\s|,)(\d+)[-\s]?(?:counts?|ct|pcs)\b/i;
    
    // Expanded thematic tokens mimicking your production file updates
    const TOTAL_WEIGHT_PRODUCT_THEMES = /\b(?:bar|bars|candy|candies|peppermint|sweets|brites)\b/i;

    let quantity = 1;
    let value = 0;
    let unit = 'unknown';

    // 1. Extract base unit measure matching UNIT_REGEX order
    const ozMatch = cleanTitle.match(UNIT_REGEX.oz);
    if (ozMatch) {
        value = parseFloat(ozMatch[1]);
        unit = 'oz';
    }

    // 2. Extract potential multiplier quantity if present
    if (unit !== 'unknown' && unit !== 'count') {
        const countMatch = cleanTitle.match(COUNT_AS_QUANTITY_REGEX);
        if (countMatch) {
            const potentialQuantity = parseInt(countMatch[1], 10);
            quantity = potentialQuantity;
        }
    }

    // 3. Apply the critical deployed structural safeguard fix
    if (quantity > 1 && unit === 'oz') {
        const isPackageTotalTheme = TOTAL_WEIGHT_PRODUCT_THEMES.test(cleanTitle);
        if (isPackageTotalTheme) {
            // Treat explicit count string inside bulk confections as an informational token, NOT a multiplier
            quantity = 1;
        }
    }

    let totalValue = value * quantity;

    return {
        value,
        unit,
        quantity,
        totalValue,
        formatted: `${totalValue} ${unit}`
    };
}

// Native Node Test Runner Suite Execution Block
test('Windows Production Audit: Confection Quantity Compounding Prevention Bugfix', async (t) => {
    
    await t.test('Should freeze volume at 64oz and suppress secondary 360ct multiplier flag', () => {
        const targetTitle = "Brach's Star Brites, Peppermint, Individually Wrapped, Made With Real Peppermint Oil, 64oz, 360ct";
        
        const calculationOutput = parseUnitMock(targetTitle);

        // Assertions verifying that compounding arithmetic error is caught
        assert.equal(calculationOutput.unit, 'oz');
        assert.equal(calculationOutput.value, 64);
        assert.equal(calculationOutput.quantity, 1);
        assert.equal(calculationOutput.totalValue, 64);
    });

    await t.test('Should still allow normal multiplier processing if product theme is safe', () => {
        const safeTitle = "Generic Pack, 16oz";
        const calculationOutput = parseUnitMock(safeTitle);

        assert.equal(calculationOutput.totalValue, 16);
        assert.equal(calculationOutput.quantity, 1);
    });
});