import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';
import { convertValue, calculatePricePerUnit, UnitType } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; 

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const targetUnit = searchParams.get('u') as any; // The 'u' parameter from frontend

    let results = await searchProducts(query!);

    if (targetUnit && targetUnit !== '') {
        results = results.map(p => {
            const converted = convertValue(p.totalAmount ?? 0, p.unit as any, targetUnit);
            if (converted) {
                return {
                    ...p,
                    totalAmount: converted,
                    unit: targetUnit,
                    pricePerUnit: calculatePricePerUnit(p.price, converted, targetUnit)
                };
            }
            return p;
        });
    }
    return NextResponse.json(results);
}