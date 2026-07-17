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
        
        // CHANNEL 2: Public Scraper Fallback Engine (Concurrently Targeting Amazon & Walmart)
        try {
            const decodoUrl = `https://scraper-api.decodo.com/v2/scrape`;
            const decodoToken = process.env.DECODO_AUTH_TOKEN || "";

            const targetPayloads = [
                {
                    source: 'amazon',
                    url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}`
                },
                {
                    source: 'walmart',
                    url: `https://www.walmart.com/search?q=${encodeURIComponent(query)}`
                }
            ];

            const scraperPromises = targetPayloads.map(async (target) => {
                // Determine parameters based on target retailer requirements
                const useFullBrowser = target.source === 'walmart';

                const res = await fetch(decodoUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${decodoToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        url: target.url,
                        proxy_pool: "premium",
                        // Force real Chromium emulation on Walmart to crack the PerimeterX edge firewall
                        headless: useFullBrowser ? "true" : "html", 
                        wait_until: useFullBrowser ? "networkidle0" : undefined,
                        custom_headers: useFullBrowser ? {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                            "Accept-Language": "en-US,en;q=0.9",
                            "Cache-Control": "max-age=0"
                        } : undefined
                    })
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
                    const html = data.results?.[0]?.content || data.content || "";
                    
                    if (!html) {
                        console.warn(`[RISK WARNING] Null response content returned from source: ${source}`);
                        return;
                    }

                    if (source === 'amazon') {
                        const matchAsins = [...html.matchAll(/data-asin="([A-Z0-9]{10})"/g)].map(m => m[1]);
                        const uniqueAsins = Array.from(new Set(matchAsins));
                        uniqueAsins.forEach(asin => {
                            collectedItems.push({ 
                                id: `amzn-${asin}`, 
                                sku: asin, 
                                price: 1.0, 
                                title: `${query} (Amazon)`,
                                retailer: 'amazon'
                            });
                        });
                    } else if (source === 'walmart') {
                        let matchWalmartIds: string[] = [];

                        // DIAGNOSTIC CHECK: Trace if the firewall blocked the request
                        if (html.includes("captcha") || html.includes("blocked") || html.includes("Access Denied") || html.includes("PerimeterX")) {
                            console.error(`[RISK WARNING] Decodo target for Walmart was flagged and blocked by anti-bot firewall. Snippet: ${html.substring(0, 300)}`);
                        }

                        // Strategy A: Intercept the immutable Next.js SSR data payload matrix
                        try {
                            const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
                            if (jsonMatch && jsonMatch[1]) {
                                const parsedData = JSON.parse(jsonMatch[1]);
                                const itemsArray = parsedData.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || [];
                                
                                itemsArray.forEach((wmtItem: any) => {
                                    if (wmtItem.usItemId) {
                                        matchWalmartIds.push(String(wmtItem.usItemId));
                                    } else if (wmtItem.id) {
                                        matchWalmartIds.push(String(wmtItem.id));
                                    }
                                });
                            }
                        } catch (jsonErr) {
                            // Suppress verbose JSON parsing logging in production
                        }

                        // Strategy B: Robust DOM Regex Attribute Fallback
                        if (matchWalmartIds.length === 0) {
                            const attrMatches = [...html.matchAll(/(?:data-item-id|itemId|product-id)="([0-9]+)"/g)].map(m => m[1]);
                            matchWalmartIds.push(...attrMatches);
                        }

                        // Strategy C: Global product page link tracking fallback
                        if (matchWalmartIds.length === 0) {
                            const linkMatches = [...html.matchAll(/\/ip\/([^/]+)\/([0-9]+)/g)];
                            linkMatches.forEach(m => { if (m[2]) matchWalmartIds.push(m[2]); });
                        }
                        
                        const uniqueIds = Array.from(new Set(matchWalmartIds));
                        uniqueIds.forEach(itemId => {
                            collectedItems.push({ 
                                id: `wmt-${itemId}`, 
                                sku: itemId, 
                                price: 1.0, 
                                title: `${query} (Walmart)`,
                                retailer: 'walmart',
                                unit: 'unit',
                                totalAmount: 1
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
            const unitPrice = parseFloat(p.price || p.amazon_price || p.retail_price || p.price_amount || 0);
            
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