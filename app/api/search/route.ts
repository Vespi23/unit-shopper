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

    const rawResults: any[] = [];
    let errorContext = "";

    try {
        // FIXED: Reverting to Decodo's single unified web scraping endpoint
        const decodoUrl = "https://scraper-api.decodo.com/v2/scrape";
        const decodoToken = process.env.DECODO_AUTH_TOKEN || "";

        const targetPayloads = [
            {
                source: 'amazon',
                body: {
                    target: "amazon_search",
                    query: query,
                    proxy_pool: "premium",
                    output_format: "json"
                }
            },
            {
                source: 'walmart',
                body: {
                    target: "walmart_search",
                    query: query,
                    proxy_pool: "premium",
                    output_format: "json"
                }
            }
        ];

        for (const target of targetPayloads) {
            try {
                const res = await fetch(decodoUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${decodoToken}`,
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(target.body)
                });

                if (!res.ok) {
                    errorContext += `[${target.source} HTTP Error Status ${res.status}] `;
                    continue;
                }

                const data = await res.json();
                
                // Extract structured item content blocks safely from Decodo's JSON response format
                const dataBlock = data.results?.[0]?.content || data.parsing_results || data;
                const items = dataBlock.products || dataBlock.search_results || dataBlock.results || [];
                
                if (!Array.isArray(items)) continue;

                if (target.source === 'amazon') {
                    for (const item of items) {
                        const asin = item.asin || item.id || Math.random().toString();
                        const rawPrice = item.price || item.current_price || "0.00";
                        const itemPrice = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0.0;
                        
                        let totalAmount = 1;
                        let unit = 'unit';
                        const titleString = item.title || '';
                        const volumeMatch = titleString.match(/([0-9.]+)\s*(oz|ounce|lb|pound|fl\s*oz|gal|gallon|ct|pack)/i);
                        if (volumeMatch) {
                            totalAmount = parseFloat(volumeMatch[1]);
                            unit = volumeMatch[2].toLowerCase();
                        }

                        rawResults.push({
                            id: `amzn-${asin}`,
                            sku: asin,
                            price: itemPrice,
                            title: titleString || `${query} (Amazon Product)`,
                            name: titleString || `${query} (Amazon Product)`,
                            retailer: 'amazon',
                            source: 'amazon',
                            url: item.url || `https://www.amazon.com/dp/${asin}`,
                            link: item.url || `https://www.amazon.com/dp/${asin}`,
                            unit: item.unit || unit,
                            unit_type: item.unit || unit,
                            totalAmount: parseFloat(item.amount || item.size || totalAmount),
                            amount: parseFloat(item.amount || item.size || totalAmount),
                            image: item.image || item.thumbnail || '',
                            thumbnail: item.thumbnail || item.image || '',
                            rating: item.rating ? parseFloat(item.rating) : 4.5,
                            reviews: item.reviews ? parseInt(item.reviews) : 100
                        });
                    }
                } else if (target.source === 'walmart') {
                    for (const item of items) {
                        const itemId = item.id || item.usItemId || item.productId || Math.random().toString();
                        const rawPrice = item.price?.current_price || item.price || "0.00";
                        const itemPrice = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0.0;
                        
                        let totalAmount = 1;
                        let unit = 'unit';
                        const titleString = item.title || item.name || '';

                        if (item.weight || item.size) {
                            const sizeStr = String(item.weight || item.size);
                            const parsedSize = parseFloat(sizeStr.replace(/[^0-9.]/g, ''));
                            const parsedUnit = sizeStr.replace(/[0-9.\s]/g, '').toLowerCase();
                            if (parsedSize) totalAmount = parsedSize;
                            if (parsedUnit) unit = parsedUnit;
                        } else {
                            const volumeMatch = titleString.match(/([0-9.]+)\s*(oz|ounce|lb|pound|fl\s*oz|gal|gallon|ct|pack)/i);
                            if (volumeMatch) {
                                totalAmount = parseFloat(volumeMatch[1]);
                                unit = volumeMatch[2].toLowerCase();
                            }
                        }

                        rawResults.push({
                            id: `wmt-${itemId}`,
                            sku: itemId,
                            price: itemPrice,
                            title: titleString || `${query} (Walmart Product)`,
                            name: titleString || `${query} (Walmart Product)`,
                            retailer: 'walmart',
                            source: 'walmart',
                            url: item.url || `https://www.walmart.com/ip/${itemId}`,
                            link: item.url || `https://www.walmart.com/ip/${itemId}`,
                            unit: item.unit_type || item.salesUnitType || unit,
                            unit_type: item.unit_type || item.salesUnitType || unit,
                            totalAmount: parseFloat(item.amount || item.size || totalAmount),
                            amount: parseFloat(item.amount || item.size || totalAmount),
                            image: item.image || item.thumbnail || '',
                            thumbnail: item.thumbnail || item.image || '',
                            rating: item.rating ? parseFloat(item.rating) : 4.5,
                            reviews: item.reviews ? parseInt(item.reviews) : 50
                        });
                    }
                }
            } catch (innerError: any) {
                errorContext += `[Loop error for ${target.source}: ${innerError.message}] `;
            }
        }
    } catch (globalErr: any) {
        errorContext += `[Global Ingestion Failure: ${globalErr.message}]`;
    }

    if (rawResults.length === 0) {
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