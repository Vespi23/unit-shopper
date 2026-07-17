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

    if (!query.trim()) {
        return NextResponse.json([]);
    }

    let rawResults: any[] = [];
    let errorContext = "";

    // DECODO EXCLUSIVE EXECUTION ENGINE - Direct Channel Bypass
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
                    target: "universal", 
                    proxy_pool: "premium",
                    headless: "true", 
                    device_type: "desktop_chrome", 
                    output_format: "json", 
                    custom_extraction: {
                        products: {
                            _selector: "[data-item-id], .w-percent, [data-testid='list-view'], .mb1",
                            id: "attr:data-item-id",
                            title: "span.w_i0, [data-automation-id='product-title'], .mb1 .w_i0",
                            price: "span.w_iB, [data-automation-id='product-price'], .w_iB"
                        }
                    }
                }
            }
        ];

        // Execute scraper engines concurrently via clean parallel mapping
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
                            title: `${query} (Amazon Product)`,
                            retailer: 'amazon',
                            unit: 'unit',
                            totalAmount: 1
                        });
                    });
                } 
                else if (source === 'walmart') {
                    const extractionBlock = data.results?.[0]?.custom_extraction || data.custom_extraction;
                    let parsedItems = extractionBlock?.products || [];

                    // Layer B Strategy: Deep Hydration Matrix Recovery Sweep
                    if (parsedItems.length === 0) {
                        const rawHtml = data.results?.[0]?.content || data.content || "";
                        
                        if (rawHtml.includes("Access Denied") || rawHtml.includes("captcha")) {
                            console.error(`[CRITICAL FIREWALL BLOCK]: Walmart anti-bot intercepted session payload.`);
                        }

                        const jsonMatch = rawHtml.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
                        if (jsonMatch && jsonMatch[1]) {
                            try {
                                const parsedData = JSON.parse(jsonMatch[1]);
                                const rawArray = parsedData.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || [];
                                rawArray.forEach((wmtItem: any) => {
                                    if (wmtItem.usItemId || wmtItem.id) {
                                        parsedItems.push({
                                            id: String(wmtItem.usItemId || wmtItem.id),
                                            title: wmtItem.title || wmtItem.name,
                                            price: wmtItem.priceInfo?.currentPrice?.price || wmtItem.price?.current_price || wmtItem.price
                                        });
                                    }
                                });
                            } catch (_) {}
                        }
                    }

                    // Layer C Strategy: Page Path String Fallback Parser
                    if (parsedItems.length === 0) {
                        const rawHtml = data.results?.[0]?.content || data.content || "";
                        const linkMatches = [...rawHtml.matchAll(/\/ip\/([^/]+)\/([0-9]+)/g)];
                        linkMatches.forEach(m => {
                            if (m[2]) {
                                parsedItems.push({ id: m[2], title: `${query} (Walmart)`, price: "1.00" });
                            }
                        });
                    }

                    parsedItems.forEach((item: any) => {
                        if (!item.id) return;
                        const rawPrice = item.price || "1.00";
                        const cleanPrice = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 1.0;

                        collectedItems.push({
                            id: `wmt-${item.id}`,
                            sku: item.id,
                            price: cleanPrice,
                            title: item.title || `${query} (Walmart Product)`,
                            retailer: 'walmart',
                            unit: item.unit || 'unit',
                            totalAmount: item.totalAmount || 1
                        });
                    });
                }
            } else {
                errorContext += `[Scrape Scoping Exception: ${outcome.reason.message}] `;
            }
        });

        rawResults = collectedItems;

    } catch (fallbackError: any) {
        errorContext += `[Infallible Engine Fatal Failure: ${fallbackError.message}]`;
    }

    if (!Array.isArray(rawResults) || rawResults.length === 0) {
        console.warn(`[SEARCH_EMPTY_BYPASS]: Returning baseline array. Trace: ${errorContext}`);
        return NextResponse.json([]);
    }

    // LAYER 3: DYNAMICALLY ISOLATED UNIT TRANSLATION ENGINE
    try {
        const targetUnit = toCanonicalUnit(searchParams.get('u') || searchParams.get('unit') || '');

        const processedResults = rawResults.map(p => {
            if (!p) return null;
            
            const currentUnit = toCanonicalUnit(p.unit || p.unit_type || '');
            const currentAmount = parseFloat(p.totalAmount || p.amount || p.size || p.volume || 0);
            const unitPrice = parseFloat(p.price || 0);
            
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
        console.error(`[ISOLATED_UNIT_PARSER_CRASH_RECOVERY]: Intercepted global unit-parser module failure: ${parsingError.message}`);
        
        const structuralFallback = rawResults.map(p => ({
            ...p,
            unitInfo: { value: 0, unit: "unknown", quantity: 1, totalValue: 0, formatted: "Pending Calibration" },
            pricePerUnit: 0
        }));
        return NextResponse.json(structuralFallback);
    }
}