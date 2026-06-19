import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/api-client';
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
    let processingErrorContext = "";

    // PIPELINE CHANNEL 1: Try primary internal client connection
    try {
        rawResults = await searchProducts(query);
    } catch (primaryError: any) {
        processingErrorContext += `[Primary: ${primaryError.message}] `;
        
        // PIPELINE CHANNEL 2: Safe direct fetch fallback bypass
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
                // Channel 2 network anomaly safety escape hatch
                const errContext = await fallbackRes.text().catch(() => "Unknown response body");
                processingErrorContext += `[Fallback API: Status ${fallbackRes.status} - ${errContext}]`;
            }
        } catch (fallbackError: any) {
            processingErrorContext += `[Fallback Network Exception: ${fallbackError.message}]`;
        }
    }

    // LAYER 3: EXHAUSTED RECOVERY INLINE DECOUPLING
    // If both data calls return completely empty or fail, prevent 500 status codes at all costs.
    if (!Array.isArray(rawResults) || rawResults.length === 0) {
        console.error(`[SEARCH_EXHAUSTED_WARNING]: Complete data channel disruption. Context: ${processingErrorContext || "No items returned."}`);
        
        // Return a clean HTTP 200 payload with a standard empty baseline matrix to unblock component loops
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
        console.error(`[UNIT_PARSING_LOOP_FAULT]: Data transformation crash: ${parsingError.message}`);
        return NextResponse.json({ error: "Data transformation error footprint" }, { status: 200 }); // Downgrade to 200 to prevent interface drops
    }
}