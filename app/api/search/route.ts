import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';
import { 
    convertValue, 
    calculatePricePerUnit, 
    toCanonicalUnit 
} from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; 

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    // SEO FIX: Standardize the unit input immediately
    const rawUnit = searchParams.get('u') || '';
    const targetUnit = toCanonicalUnit(rawUnit);

    // Safety check for empty queries
    if (!query) {
        return NextResponse.json([]);
    }

    try {
        let results = await searchProducts(query);

        // Map and Clean results for the Frontend + SEO Schema
        results = results.map(p => {
            // Ensure we have a clean unitInfo structure for the frontend SearchPage
            const currentUnit = toCanonicalUnit(p.unit || '');
            const currentAmount = p.totalAmount || 0;

            let finalAmount = currentAmount;
            let finalUnit = currentUnit;

            // Perform server-side conversion if requested
            if (targetUnit && targetUnit !== 'unknown' && currentUnit !== 'unknown') {
                const converted = convertValue(currentAmount, currentUnit, targetUnit);
                if (converted) {
                    finalAmount = converted;
                    finalUnit = targetUnit;
                }
            }

            return {
                ...p,
                price: typeof p.price === 'string' ? parseFloat(p.price.replace(/[^0-9.]/g, '')) : p.price,
                currency: p.currency || 'USD',
                // Keep unitInfo nested so SearchPage.tsx and Schema.ts can read it correctly
                unitInfo: {
                    totalValue: finalAmount,
                    unit: finalUnit,
                    formatted: `${finalAmount.toFixed(2)} ${finalUnit}`
                },
                pricePerUnit: calculatePricePerUnit(p.price, finalAmount, finalUnit)
            };
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}