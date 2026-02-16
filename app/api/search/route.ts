import { NextResponse } from 'next/server';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { parseUnit, normalizeUnit, calculatePricePerUnit } from '@/lib/unit-parser';
import { Product } from '@/lib/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    // Filter mock data
    let results: Product[] = MOCK_PRODUCTS.filter(p =>
        query ? p.title.toLowerCase().includes(query) : true
    );

    // Apply Unit Logic
    results = results.map(product => {
        const unitInfo = parseUnit(product.title);
        let pricePerUnit = 'N/A';
        let normalizedUnitInfo = undefined;
        let score = 999999;

        if (unitInfo) {
            normalizedUnitInfo = normalizeUnit(unitInfo);
            pricePerUnit = calculatePricePerUnit(product.price, normalizedUnitInfo.totalValue, normalizedUnitInfo.unit);

            if (normalizedUnitInfo.totalValue > 0) {
                score = product.price / normalizedUnitInfo.totalValue;
            }
        }

        return {
            ...product,
            unitInfo: normalizedUnitInfo || undefined,
            pricePerUnit,
            score
        };
    });

    // Sort by Unit Price (Cheapest First) by default
    results.sort((a, b) => (a.score || 999999) - (b.score || 999999));

    return NextResponse.json({ results });
}
