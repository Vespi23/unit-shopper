import { parseUnit, normalizeUnit, calculatePricePerUnit } from './lib/unit-parser';

const TEST_CASES = [
    { title: "Peanut Butter 16oz", expected: { totalValue: 16, unit: 'oz' } },
    { title: "Peanut Butter 16 oz 2 Pack", expected: { totalValue: 32, unit: 'oz' } },
    { title: "Coffee 2.5 lbs", expected: { totalValue: 40, unit: 'oz' } }, // 2.5 * 16 = 40
    { title: "Soda 2 Liters", expected: { totalValue: 2000, unit: 'ml' } },
    { title: "Advil 100 Count", expected: { totalValue: 100, unit: 'count' } },
    { title: "Pack of 2 - 100 Count Advil", expected: { totalValue: 200, unit: 'count' } }, // 2 * 100
];

console.log("Running Unit Parser Tests...\n");

TEST_CASES.forEach((test, i) => {
    console.log(`Test #${i + 1}: ${test.title}`);
    const result = parseUnit(test.title);

    if (!result) {
        console.error("  FAILED: parseUnit returned null");
        return;
    }

    const normalized = normalizeUnit(result);
    console.log(`  Parsed: ${result.value} ${result.unit} (Qty: ${result.quantity}) -> Total: ${result.totalValue}`);
    console.log(`  Norm:   ${normalized.totalValue} ${normalized.unit}`);

    const matchesTotal = Math.abs(normalized.totalValue - test.expected.totalValue) < 0.1;
    const matchesUnit = normalized.unit === test.expected.unit;

    if (matchesTotal && matchesUnit) {
        console.log("  PASS ✅");
    } else {
        console.error(`  FAIL ❌ (Expected ${test.expected.totalValue} ${test.expected.unit})`);
    }
    console.log("");
});
