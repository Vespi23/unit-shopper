import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';
import { convertValue, calculatePricePerUnit, UnitType } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; 

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const targetUnit = searchParams.get('u') as UnitType | null; // e.g., ?u=lb

    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    try {
        // searchProducts now handles the 56s ceiling internally
        let results = await searchProducts(query);

        // --- GENERALIZATION OVERRIDE ---
        if (targetUnit && results.length > 0) {
            results = results.map(p => {
                const converted = convertValue(
                    p.totalAmount ?? 0, 
                    (p.unit as UnitType) || 'unknown', 
                    targetUnit
                );
                
                if (converted !== null && converted > 0) {
                    return {
                        ...p,
                        totalAmount: converted,
                        unit: targetUnit,
                        pricePerUnit: calculatePricePerUnit(p.price, converted, targetUnit),
                        generalized: true
                    };
                }
                return { ...p, incompatible: true };
            });
        }

        return NextResponse.json(results.slice(0, 100), {
            headers: { 'X-Execution-Ceiling': '56s' }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}