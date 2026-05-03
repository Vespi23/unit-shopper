import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';
import { toCanonicalUnit, convertValue, calculatePricePerUnit } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; // Requested limit (Ignored by Vercel Hobby)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const targetUnit = toCanonicalUnit(searchParams.get('u') || '');

    if (!query) return NextResponse.json([]);

    try {
        let results = await searchProducts(query);
        
        results = results.map(p => {
            const currentUnit = toCanonicalUnit(p.unit || '');
            const currentAmount = p.totalAmount || 0;
            let finalAmount = currentAmount;
            let finalUnit = currentUnit;

            if (targetUnit !== 'unknown' && currentUnit !== 'unknown') {
                const converted = convertValue(currentAmount, currentUnit, targetUnit);
                if (converted) {
                    finalAmount = converted;
                    finalUnit = targetUnit;
                }
            }

            return {
                ...p,
                unitInfo: {
                    value: finalAmount, 
                    unit: finalUnit,
                    quantity: 1, 
                    totalValue: finalAmount,
                    formatted: `${finalAmount.toFixed(2)} ${finalUnit}`
                },
                pricePerUnit: calculatePricePerUnit(p.price, finalAmount, finalUnit)
            };
        });

        return NextResponse.json(results);
    } catch (error) {
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}