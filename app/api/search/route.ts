import { NextResponse } from 'next/server';

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

    if (!query.trim()) {
        return NextResponse.json([]);
    }

    let rawResults: any[] = [];
    let errorContext = "";

    // CHANNEL 1: Dynamic Search Fetch Execution
    try {
        const clientModule = await import('@/lib/api-client');
        if (clientModule && typeof clientModule.searchProducts === 'function') {
            rawResults = await clientModule.searchProducts(query);
        } else {
            throw new Error("Target search products function missing.");
        }
    } catch (primaryError: any) {
        errorContext += `[Search Client Fault: ${primaryError.message}] `;
        
        // CHANNEL 2: Public Scraper Fallback Engine (Native E-Commerce Tasks Infrastructure)
        try {
            // Migrating directly to Decodo's verified task ingestion node to enforce native JSON generation
            const decodoUrl = `https://scraper-api.decodo.com/v1/tasks`; // Correct API pathway
            const decodoToken = process.env.DECODO_AUTH_TOKEN || "";

            const targetPayloads = [
                {
                    source: 'amazon',
                    body: {
                        target: "amazon_search", // Instruct Decodo to apply native e-commerce parsing engines
                        query: query,
                        proxy_pool: "premium"
                    }
                },
                {
                    source: 'walmart',
                    body: {
                        target: "walmart_search", // Native target protocol bypasses captcha gates instantly
                        query: query,
                        proxy_pool: "premium"
                    }
                }
            ];

            const scraperPromises = targetPayloads.map(async (target) => {
                const res = await fetch(decodoUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${decodoToken}`,
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(target.body)
                });
                
                if (!res.ok) throw new Error(`HTTP Error Status ${res.status}`);
                const data = await res.json();
                return { source: target.source, data };
            });

            const settledScrapes = await Promise.allSettled(scraperPromises);
            const collectedItems: any[] = [];

            settledScrapes.forEach((outcome) => {
                if (outcome.status === 'fulfilled') {
                    const { source, data } = outcome.value;
                    
                    // Access structured e-commerce arrays natively mapped inside Decodo's output format
                    const dataBlock = data.results?.[0]?.content || data.parsing_results || data;
                    const items = dataBlock.products || dataBlock.search_results || [];

                    if (source === 'amazon') {
                        items.forEach((item: any) => {
                            const asin = item.asin || item.id || Math.random().toString();
                            const itemPrice = parseFloat(String(item.price || item.current_price || "1.00").replace(/[^0-9.]/g, '')) || 1.0;
                            collectedItems.push({
                                id: `amzn-${asin}`,
                                sku: asin,
                                price: itemPrice,
                                title: item.title || `${query} (Amazon Product)`,
                                retailer: 'amazon',
                                unit: item.unit_type || 'unit',
                                totalAmount: parseFloat(item.amount || item.size || 1)
                            });
                        });
                    } 
                    else if (source === 'walmart') {
                        items.forEach((item: any) => {
                            const itemId = item.id || item.usItemId || item.productId || Math.random().toString();
                            const itemPrice = parseFloat(String(item.price?.current_price || item.price || "1.00").replace(/[^0-9.]/g, '')) || 1.0;
                            collectedItems.push({
                                id: `wmt-${itemId}`,
                                sku: itemId,
                                price: itemPrice,
                                title: item.title || item.name || `${query} (Walmart Product)`,
                                retailer: 'walmart',
                                unit: item.unit_type || item.salesUnitType || 'unit',
                                totalAmount: parseFloat(item.amount || item.size || item.weight || 1)
                            });
                        });
                    }
                } else {
                    errorContext += `[Scrape Scoping Exception: ${outcome.reason.message}] `;
                }
            });

            rawResults = collectedItems;

        } catch (fallbackError: any) {
            errorContext += `[Fallback Network Failure: ${fallbackError.message}]`;
        }
    }

    if (!Array.isArray(rawResults) || rawResults.length === 0) {
        console.warn(`[SEARCH_EMPTY_BYPASS]: Returning baseline array. Trace: ${errorContext}`);
        return NextResponse.json([]);
    }

    // LAYER 3: DYNAMICALLY ISOLATED UNIT TRANSLATION ENGINE
    try {
        const parserModule = await import('@/lib/unit-parser');
        const targetUnit = parserModule.toCanonicalUnit(searchParams.get('u') || searchParams.get('unit') || '');

        const processedResults = rawResults.map(p => {
            if (!p) return null;
            
            const currentUnit = parserModule.toCanonicalUnit(p.unit || p.unit_type || '');
            const currentAmount = parseFloat(p.totalAmount || p.amount || p.size || p.volume || 0);
            const unitPrice = parseFloat(p.price || 0);
            
            let finalAmount = currentAmount;
            let finalUnit = currentUnit;

            if (targetUnit !== 'unknown' && currentUnit !== 'unknown') {
                const converted = parserModule.convertValue(currentAmount, currentUnit, targetUnit);
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
                pricePerUnit: parserModule.calculatePricePerUnit(unitPrice, finalAmount, finalUnit)
            };
        }).filter(Boolean);

        return NextResponse.json(processedResults);
    } catch (parsingError: any) {
        console.error(`[ISOLATED_UNIT_PARSER_CRASH_RECOVERY]: Intercepted global unit-parser module failure: ${parsingError.message}`);
        
        const structuralFallback = rawResults.map(p => ({
            ...p,
            unitInfo: { value: 0, unit: "unknown", quantity: 1, totalValue: 0, formatted: "Pending Calibration" },
            pricePerUnit: 0
        }));
        return NextResponse.json(structuralFallback);
    }
}