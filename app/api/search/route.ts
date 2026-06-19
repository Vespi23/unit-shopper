import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';
import { toCanonicalUnit, convertValue, calculatePricePerUnit } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; 

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    // FIXED: Loose-binding fallback matrix checks all common search parameter names
    const query = searchParams.get('q') || 
                  searchParams.get('query') || 
                  searchParams.get('term') || 
                  searchParams.get('searchTerm') || 
                  '';
                  
    const targetUnit = toCanonicalUnit(searchParams.get('u') || searchParams.get('unit') || '');

    // Strict validation check only if all variants are blank
    if (!query.trim()) {
        console.warn("[SEARCH_ROUTE_EMPTY_TRIGGER]: Aborted search pass. No valid text query parameters matched.");
        return NextResponse.json([]);
    }

    let rawResults: any[] = [];

    try {
        console.log(`[PUBLIC_SEARCH_GATE]: Ingested query target: "${query}"`);
        rawResults = await searchProducts(query);
    } catch (primaryError: any) {
        console.error(`[SEARCH_ROUTE_RECOVERY_TRIGGERED]: Primary search failed: ${primaryError.message}`);
        
        try {
            const fallbackRes = await fetch(`https://scraper-api.decodo.com/v3/search?q=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${process.env.DECODO_AUTH_TOKEN || ""}`
                },
                next: { revalidate: 300 }
            });
            
            if (fallbackRes.ok) {
                const data = await fallbackRes.json();
                rawResults = data.results || data.products || [];
            } else {
                throw new Error(`Upstream fallback engine returned status ${fallbackRes.status}`);
            }
        } catch (fallbackError: any) {
            console.error(`[SEARCH_CRITICAL_COMPLETE_FAILURE]: Both routes exhausted: ${fallbackError.message}`);
            return NextResponse.json({ error: "Search cluster fully desynchronized" }, { status: 500 });
        }
    }

    try {
        const processedResults = rawResults.map(p => {
            const currentUnit = toCanonicalUnit(p.unit || p.unit_type || '');
            const currentAmount = parseFloat(p.totalAmount || p.amount || p.size || p.volume || 0);
            const unitPrice = parseFloat(p.price || p.amazon_price || p.retail_price || 0);
            
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
                price: unitPrice,
                unitInfo: {
                    value: finalAmount, 
                    unit: finalUnit,
                    quantity: p.quantity || 1, 
                    totalValue: finalAmount,
                    formatted: `${finalAmount.toFixed(2)} ${finalUnit}`
                },
                pricePerUnit: calculatePricePerUnit(unitPrice, finalAmount, finalUnit)
            };
        });

        return NextResponse.json(processedResults);
    } catch (parsingError: any) {
        console.error(`[UNIT_PARSING_LOOP_FAULT]: ${parsingError.message}`);
        return NextResponse.json({ error: "Data transformation failed" }, { status: 500 });
    }
}