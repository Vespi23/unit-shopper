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
        
        // CHANNEL 2: Public Scraper Fallback Engine (Leveraging Native eCommerce Parsing)
        try {
            const decodoUrl = `https://scraper-api.decodo.com/v2/scrape`;
            const decodoToken = process.env.DECODO_AUTH_TOKEN || "";

            const targetPayloads = [
                {
                    source: 'amazon',
                    body: {
                        url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
                        proxy_pool: "premium",
                        headless: "html"
                    }
                },
                {
                    source: 'walmart',
                    body: {
                        url: `https://www.walmart.com/search?q=${encodeURIComponent(query)}`,
                        proxy_pool: "premium",
                        // Instruct Decodo to apply its specialized Walmart parser and return structured JSON
                        target: "walmart_search", 
                        locale: "en-us"
                    }
                }
            ];

            const scraperPromises = targetPayloads.map(async (target) => {
                const res = await fetch(decodoUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${decodoToken}`,
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
                    
                    if (source === 'amazon') {
                        const html = data.results?.[0]?.content || data.content || "";
                        if (!html) return;
                        const matchAsins = [...html.matchAll(/data-asin="([A-Z0-9]{10})"/g)].map(m => m[1]);
                        Array.from(new Set(matchAsins)).forEach(asin => {
                            collectedItems.push({ 
                                id: `amzn-${asin}`, 
                                sku: asin, 
                                price: 1.0, 
                                title: `${query} (Amazon)`,
                                retailer: 'amazon',
                                unit: 'unit',
                                totalAmount: 1
                            });
                        });
                    } 
                    else if (source === 'walmart') {
                        // Handle the clean, anti-bot-parsed JSON data structure returned by Decodo's target engine
                        const resultsContainer = data.results?.[0]?.content || data.parsing_results || data;
                        const items = resultsContainer.products || resultsContainer.search_results || [];
                        
                        if (items.length === 0 && data.content) {
                            console.warn(`[RISK WARNING] Template falling back to explicit JSON state sweep on string block.`);
                            const match = data.content.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
                            if (match && match[1]) {
                                try {
                                    const parsed = JSON.parse(match[1]);
                                    const extracted = parsed.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || [];
                                    extracted.forEach((i: any) => items.push({ title: i.title, id: i.usItemId || i.id, price: i.price }));
                                } catch (_) {}
                            }
                        }

                        items.forEach((item: any) => {
                            const parsedId = item.id || item.usItemId || item.productId || Math.random().toString();
                            const itemPrice = item.price?.current_price || item.price || 1.0;
                            collectedItems.push({
                                id: `wmt-${parsedId}`,
                                sku: parsedId,
                                price: parseFloat(String(itemPrice)),
                                title: item.title || `${query} (Walmart)`,
                                retailer: 'walmart',
                                unit: item.unit_type || 'unit',
                                totalAmount: parseFloat(item.amount || item.size || 1)
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