import { NextResponse } from 'next/server';
import { parseUnit, normalizeUnit, toCanonicalUnit, convertValue, calculatePricePerUnit } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const maxDuration = 60; 

function locateDataArray(obj: any): any[] {
    if (Array.isArray(obj)) return obj;
    if (typeof obj !== 'object' || obj === null) return [];
    if (obj.organic && Array.isArray(obj.organic)) return obj.organic;
    if (obj.search_results && Array.isArray(obj.search_results)) return obj.search_results;
    if (obj.results && Array.isArray(obj.results)) return obj.results;
    if (obj.products && Array.isArray(obj.products)) return obj.products;
    for (const key in obj) {
        if (Array.isArray(obj[key]) && obj[key].length > 0) return obj[key];
    }
    return [];
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const sortStrategy = searchParams.get('sort') || 'unit_value'; // Target dropdown key parser

    if (!query.trim()) {
        return new NextResponse(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const rawResults: any[] = [];
    const decodoUrl = "https://scraper-api.decodo.com/v2/scrape";
    const decodoToken = process.env.DECODO_AUTH_TOKEN || "";

    const processItem = (item: any, source: 'amazon' | 'walmart') => {
        const general = item.general || item || {};
        const ratingObj = item.rating || {};

        let title = String(general.title || item.title || item.name || "").trim();
        if (!title || title === "undefined") return;

        const parsedRating = parseFloat(String(ratingObj.averageRating || ratingObj.rating || item.averageRating || item.rating || "0"));
        const parsedCount = parseInt(String(ratingObj.numberOfReviews || ratingObj.count || item.numberOfReviews || item.reviews || item.review_count || "0"), 10);

        if (isNaN(parsedRating) || parsedRating < 4.0 || isNaN(parsedCount) || parsedCount < 100) return;

        const productId = String(general.product_id || item.asin || item.usItemId || item.id || "").replace(/[^A-Z0-9]/g, '');
        if (!productId || productId.length < 4) return;

        let rawPrice: any = null;
        if (item.priceInfo?.currentPrice?.price !== undefined) rawPrice = item.priceInfo.currentPrice.price;
        else if (item.priceInfo?.currentPrice !== undefined) rawPrice = item.priceInfo.currentPrice;
        else if (item.price?.price !== undefined) rawPrice = item.price.price;
        else if (item.price !== undefined && typeof item.price !== 'object') rawPrice = item.price;
        else if (item.current_price !== undefined) rawPrice = item.current_price;
        else if (general.price !== undefined) rawPrice = general.price;

        const price = parseFloat(String(rawPrice || "0").replace(/[^0-9.]/g, ''));
        if (isNaN(price) || price <= 0) return;

        const image = general.image || item.image || item.thumbnail || item.thumbnailUrl || "";
        
        const parsedUnitInfo = parseUnit(title);
        let unit = 'unknown';
        let totalAmount = 1;

        if (parsedUnitInfo) {
            const normalized = normalizeUnit(parsedUnitInfo);
            unit = toCanonicalUnit(normalized.unit);
            totalAmount = normalized.totalValue;
        }

        if (unit === 'unknown' || !unit || totalAmount <= 0) {
            unit = 'count';
            totalAmount = 1;
        }

        const productUrl = source === 'amazon' 
            ? `https://www.amazon.com/dp/${productId}` 
            : `https://www.walmart.com/ip/${productId}`;

        rawResults.push({
            id: source === 'amazon' ? `amzn-${productId}` : `wmt-${productId}`,
            sku: productId,
            price,
            title,
            name: title,
            retailer: source,
            source: source,
            url: productUrl,
            link: productUrl,
            unit,
            unit_type: unit,
            totalAmount,
            amount: totalAmount,
            image,
            thumbnail: image,
            rating: parsedRating,
            reviews: parsedCount,
            originalPrice: price
        });
    };

    const executeMultiPageAggregation = async () => {
        const targetPages = [1, 2, 3, 4, 5, 6, 7];
        const batchOperations: Promise<void>[] = [];

        targetPages.forEach((pageNumber) => {
            // FIXED UPSTREAM CACHE BUSTER: Injecting unique search query components straight into the parameters
            const cleanKeyToken = query.replace(/[^a-zA-Z0-9]/g, '');
            const cacheBuster = `_cb=${Date.now()}_${cleanKeyToken}_p${pageNumber}_${Math.random().toString(36).substring(4, 9)}`;

            // Amazon Template
            const amznTemplateTask = fetch(`${decodoUrl}?${cacheBuster}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${decodoToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ target: "amazon_search", query: `${query}&page=${pageNumber}`, parse: true }),
                cache: 'no-store',
                next: { revalidate: 0 }
            })
            .then(r => r.json())
            .then(d => locateDataArray(d.results?.[0]?.content || d.content || {}))
            .then(items => items.forEach(i => processItem(i, 'amazon')))
            .catch(() => {});
            batchOperations.push(amznTemplateTask);

            // Amazon HTML
            const amznHtmlTask = fetch(`${decodoUrl}?${cacheBuster}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${decodoToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}&page=${pageNumber}`, proxy_pool: "premium", headless: "html" }),
                cache: 'no-store',
                next: { revalidate: 0 }
            })
            .then(r => r.json())
            .then(d => d.results?.[0]?.content || d.content || "")
            .then(html => {
                if (!html) return;
                const blocks = html.split('data-asin="');
                blocks.shift();
                blocks.forEach((block: string) => {
                    const asin = block.substring(0, 10);
                    if (!/^[A-Z0-9]{10}$/.test(asin)) return;

                    const titleMatch = block.match(/alt="([^"]{15,250})"/i) || block.match(/<span class="a-size-base-plus a-color-base a-text-normal"[^>]*>([^<]+)<\/span>/i);
                    if (!titleMatch) return;

                    const priceWhole = block.match(/<span class="a-price-whole">([^<]+)<span/i);
                    const priceFraction = block.match(/<span class="a-price-fraction">([^<]+)<\/span>/i);
                    let price = 0;
                    if (priceWhole) price = parseFloat(priceWhole[1].replace(/[^0-9]/g, '')) + (priceFraction ? parseFloat('0.' + priceFraction[1]) : 0);
                    if (price <= 0) return;

                    const image = block.match(/src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/i)?.[1] || "";
                    const ratingMatch = block.match(/([0-4]\.[0-9]|5\.0)\s*out of 5 stars/i);
                    const countMatch = block.match(/aria-label="([0-9,]+)\s*ratings"/i) || block.match(/<span class="a-size-base[^>]*>([0-9,]+)<\/span>/i);
                    
                    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
                    const reviews = countMatch ? parseInt(countMatch[1].replace(/[^0-9]/g, ''), 10) : 0;

                    processItem({ title: titleMatch[1].trim(), asin, price, image, rating, reviews }, 'amazon');
                });
            })
            .catch(() => {});
            batchOperations.push(amznHtmlTask);

            // Walmart Template
            const wmtTemplateTask = fetch(`${decodoUrl}?${cacheBuster}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${decodoToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ target: "walmart_search", query: `${query}&page=${pageNumber}`, parse: true }),
                cache: 'no-store',
                next: { revalidate: 0 }
            })
            .then(r => r.json())
            .then(d => locateDataArray(d.results?.[0]?.content || d.content || {}))
            .then(items => items.forEach(i => processItem(i, 'walmart')))
            .catch(() => {});
            batchOperations.push(wmtTemplateTask);

            // Walmart HTML via Script Blocks
            const wmtHtmlTask = fetch(`${decodoUrl}?${cacheBuster}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${decodoToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    url: `https://www.walmart.com/search?q=${encodeURIComponent(query)}&page=${pageNumber}`, 
                    proxy_pool: "premium", 
                    headless: "html"
                }),
                cache: 'no-store',
                next: { revalidate: 0 }
            })
            .then(r => r.json())
            .then(d => d.results?.[0]?.content || d.content || "")
            .then(html => {
                if (!html) return;

                const jsonBlockMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
                if (jsonBlockMatch) {
                    try {
                        const parsedData = JSON.parse(jsonBlockMatch[1]);
                        const itemGrid = parsedData.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || [];
                        if (Array.isArray(itemGrid) && itemGrid.length > 0) {
                            itemGrid.forEach(item => processItem(item, 'walmart'));
                            return;
                        }
                    } catch {}
                }

                const fallbackBlocks = html.split('data-item-id="');
                fallbackBlocks.shift();
                fallbackBlocks.forEach((block: string) => {
                    const idMatch = block.match(/^([0-9]+)"/);
                    if (!idMatch) return;
                    const id = idMatch[1];

                    const titleMatch = block.match(/data-automation-id="product-title"[^>]*>([^<]+)</i) || block.match(/alt="([^"]+)"/i);
                    if (!titleMatch) return;

                    const priceMatch = block.match(/"current price\s*\$?([0-9.]+)"/i) || block.match(/\$(\d+(?:\.\d{2})?)/);
                    if (!priceMatch) return;
                    const price = parseFloat(priceMatch[1].replace(/[^0-9.]/g, ''));

                    const imageMatch = block.match(/src="([^"]+walmartimages\.com[^"]+)"/i);
                    const ratingMatch = block.match(/([0-4]\.[0-9]|5\.0)\s*out of 5 Stars/i);
                    const countMatch = block.match(/data-value="(\d+)"/i) || block.match(/(\d+)\s*reviews/i);

                    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
                    const reviews = countMatch ? parseInt(countMatch[1], 10) : 0;

                    processItem({ name: titleMatch[1].trim(), id, price, thumbnail: imageMatch ? imageMatch[1] : "", rating, reviews }, 'walmart');
                });
            })
            .catch(() => {});
            batchOperations.push(wmtHtmlTask);
        });

        await Promise.allSettled(batchOperations);
    };

    try {
        const internalTimeoutGuard = new Promise((_, reject) => setTimeout(() => reject(new Error('VercelTimeGateHit')), 52000));
        await Promise.race([executeMultiPageAggregation(), internalTimeoutGuard]);
    } catch {
        console.warn(`[MULTI_PAGE_TIME_GATE_ALERT]: Aggregations frame finalized.`);
    }

    let finalPayload: any[] = [];

    if (rawResults.length > 0) {
        try {
            let targetUnit = toCanonicalUnit(searchParams.get('u') || searchParams.get('unit') || '');
            if (!targetUnit || targetUnit === 'unknown') {
                const sampleUnit = rawResults.find(r => r.unit && r.unit !== 'count' && r.unit !== 'unknown')?.unit;
                targetUnit = sampleUnit ? toCanonicalUnit(sampleUnit) : 'count';
            }

            const processedResults = rawResults.map(p => {
                if (!p) return null;
                const currentUnit = toCanonicalUnit(p.unit || 'count');
                const currentAmount = parseFloat(p.totalAmount || 1);
                const unitPrice = parseFloat(p.price || 0);
                
                let finalAmount = currentAmount;
                let finalUnit = currentUnit;

                if (targetUnit !== 'unknown' && currentUnit !== 'unknown' && currentUnit !== targetUnit) {
                    const converted = convertValue(currentAmount, currentUnit, targetUnit);
                    if (converted !== null && converted > 0) {
                        finalAmount = converted;
                        finalUnit = targetUnit;
                    }
                }

                const numericPPU = finalAmount > 0 ? (unitPrice / finalAmount) : unitPrice;
                let displayUnitLabel = finalUnit === 'count' ? 'ea' : finalUnit;

                return {
                    ...p,
                    price: unitPrice,
                    score: numericPPU, // Retained for frontend legacy components
                    pricePerUnitNumeric: numericPPU, // Explicit Sorting Metric
                    totalPriceNumeric: unitPrice,    // Explicit Sorting Metric
                    pricePerUnit: calculatePricePerUnit(unitPrice, finalAmount, finalUnit),
                    ppuFormatted: `$${numericPPU.toFixed(2)}/${displayUnitLabel}`,
                    unitInfo: {
                        value: finalAmount, 
                        unit: finalUnit,
                        quantity: 1, 
                        totalValue: finalAmount,
                        formatted: `${parseFloat(finalAmount.toFixed(2))} ${finalUnit === 'count' ? 'count' : finalUnit}`
                    }
                };
            }).filter(Boolean);

            // FIXED: MULTI-STRATEGY DROPDOWN SORT ENGINE
            if (sortStrategy === 'price_asc') {
                processedResults.sort((a: any, b: any) => a.totalPriceNumeric - b.totalPriceNumeric);
            } else if (sortStrategy === 'price_desc') {
                processedResults.sort((a: any, b: any) => b.totalPriceNumeric - a.totalPriceNumeric);
            } else {
                // Default fallback: best unit value (Price per Unit ascending)
                processedResults.sort((a: any, b: any) => {
                    if (a.pricePerUnitNumeric !== b.pricePerUnitNumeric) return a.pricePerUnitNumeric - b.pricePerUnitNumeric;
                    return a.totalPriceNumeric - b.totalPriceNumeric;
                });
            }

            finalPayload = processedResults;
        } catch {
            finalPayload = rawResults;
        }
    }

    return new NextResponse(JSON.stringify(finalPayload), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        }
    });
}