import { NextResponse } from 'next/server';
import { toCanonicalUnit, convertValue, calculatePricePerUnit } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; 

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q') || 
                  searchParams.get('query') || 
                  searchParams.get('term') || 
                  searchParams.get('searchTerm') || 
                  '';
                  
    const targetUnit = toCanonicalUnit(searchParams.get('u') || searchParams.get('unit') || '');

    if (!query.trim()) {
        return NextResponse.json([]);
    }

    let rawResults: any[] = [];
    let errorContext = "";

    // CHANNEL 1: Dynamic Execution Isolation
    try {
        // FIXED: Dynamic runtime import isolates initialization exceptions away from global scope
        const clientModule = await import('@/lib/api-client');
        if (clientModule && typeof clientModule.searchProducts === 'function') {
            rawResults = await clientModule.searchProducts(query);
        } else {
            throw new Error("Target client method missing on module export vector.");
        }
    } catch (primaryError: any) {
        errorContext += `[Primary Module Initialization Exception: ${primaryError.message}] `;
        
        // CHANNEL 2: Secondary External Rescue Loop
        try {
            const fallbackRes = await fetch(`https://scraper-api.decodo.com/v3/task?q=${encodeURIComponent(query)}`, {
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
                errorContext += `[Fallback API Status: ${fallbackRes.status}]`;
            }
        } catch (fallbackError: any) {
            errorContext += `[Fallback Network Fault: ${fallbackError.message}]`;
        }
    }

    // LAYER 3: INTERCEPTOR FOR EMULATED FALLBACK FLUIDITY
    if (!Array.isArray(rawResults) || rawResults.length === 0) {
        console.warn(`[SEARCH_EMPTY_BYPASS_ENGAGED]: Returning safe empty set to unblock UI elements. Context: ${errorContext}`);
        return NextResponse.json([]);
    }

    try {
        const processedResults = rawResults.map(p => {
            if (!p) return null;
            
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
        }).filter(Boolean);

        return NextResponse.json(processedResults);
    } catch (parsingError: any) {
        console.error(`[COMPILATION_FAIL]: ${parsingError.message}`);
        return NextResponse.json([]);
    }
}