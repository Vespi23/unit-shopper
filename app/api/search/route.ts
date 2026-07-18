import { NextResponse } from 'next/server';
import { parseUnit, normalizeUnit, toCanonicalUnit, convertValue, calculatePricePerUnit } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
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

    if (!query.trim()) return NextResponse.json([]);

    const rawResults: any[] = [];
    const decodoUrl = "https://scraper-api.decodo.com/v2/scrape";
    const decodoToken = process.env.DECODO_AUTH_TOKEN || "";

    const processItem = (item: any, source: 'amazon' | 'walmart') => {
        const general = item.general || item || {};
        const ratingObj = item.rating || {};

        let title = String(general.title || item.title || "").trim();
        if (!title || title === "undefined") return;

        const parsedRating = parseFloat(String(ratingObj.rating || item.rating || "0"));
        const parsedCount = parseInt(String(ratingObj.count || item.reviews || item.review_count || "0"), 10);

        // ABSOLUTE ZERO-FLUFF QUALITY FILTERS: Drop any item failing to provide authentic, high-quality metrics
        if (isNaN(parsedRating) || parsedRating < 4.0 || isNaN(parsedCount) || parsedCount < 100) return;

        const productId = String(general.product_id || item.asin || item.id || "").replace(/[^A-Z0-9]/g, '');
        if (!productId || productId.length < 4) return;

        let rawPrice: any = null;
        if (item.priceInfo?.currentPrice?.price !== undefined) rawPrice = item.priceInfo.currentPrice.price;
        else if (item.priceInfo?.currentPrice !== undefined) rawPrice = item.priceInfo.currentPrice;
        else if (item.price?.price !== undefined) rawPrice = item.price.price;
        else if (item.price !== undefined && typeof item.price !== 'object') rawPrice = item.price;
        else if (item.current_price !== undefined) rawPrice = item.current_price;
        else if (item.price_info !== undefined) rawPrice = item.price_info;
        else if (general.price !== undefined) rawPrice = general.price;

        const price = parseFloat(String(rawPrice || "0").replace(/[^0-9.]/g, ''));
        if (isNaN(price) || price <= 0) return;

        const image = general.image || item.image || item.thumbnail || "";
        
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
            // =================================================================
            // AMAZON: MULTI-PAGE CHANNELS
            // =================================================================
            const amznTemplateTask = fetch(decodoUrl, {
                method: "POST",
                headers: { "Authorization": `Bearer ${decodoToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ target: "amazon_search", query: `${query}&page=${pageNumber}`, parse: true })
            })
            .then(r => r.json())
            .then(d => locateDataArray(d.results?.[0]?.content || d.content || {}))
            .then(items => items.forEach(i => processItem(i, 'amazon')))
            .catch(() => {});
            batchOperations.push(amznTemplateTask);

            const amznHtmlTask = fetch(decodoUrl, {
                method: "POST",
                headers: { "Authorization": `Bearer ${decodoToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}&page=${pageNumber}`, proxy_pool: "premium", headless: "html" })
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

                    const titleMatch = block.match(/alt="([^"]{15,250})"/i) ||
                                       block.match(/<span class="a-size-base-plus a-color-base a-text-normal"[^>]*>([^<]+)<\/span>/i);
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

            // =================================================================
            // WALMART: MOBILE PROFILE CONCURRENT PIPELINES
            // =================================================================
            const wmtTemplateTask = fetch(decodoUrl, {
                method: "POST",
                headers: { "Authorization": `Bearer ${decodoToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ target: "walmart_search", query: `${query}&page=${pageNumber}`, parse: true })
            })
            .then(r => r.json())
            .then(d => locateDataArray(d.results?.[0]?.content || d.content || {}))
            .then(items => items.forEach(i => processItem(i, 'walmart')))
            .catch(() => {});
            batchOperations.push(wmtTemplateTask);

            const wmtHtmlTask = fetch(decodoUrl, {
                method: "POST",
                headers: { "Authorization": `Bearer ${decodoToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    url: `https://www.walmart.com/search?q=${encodeURIComponent(query)}&page=${pageNumber}`, 
                    proxy_pool: "premium", 
                    headless: "html",
                    // TARGET MOBILE EMULATION: Forces lightweight static data strings to bypass dynamic scripts
                    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
                })
            })
            .then(r => r.json())
            .then(d => d.results?.[0]?.content || d.content || "")
            .then(html => {
                if (!html) return;
                const fallbackBlocks = html.includes('data-item-id=') ? html.split('data-item-id="') : html.split('href="/ip/');
                fallbackBlocks.shift();
                fallbackBlocks.forEach((block: string) => {
                    const idMatch = block.match(/^([^"/\s?]+)/);
                    if (!idMatch) return;
                    const id = idMatch[1].replace(/[^0-9A-Za-z]/g, '');
                    if (id.length < 4) return;

                    const titleMatch = block.match(/alt="([^"]{10,250})"/i) || block.match(/title="([^"]+)"/i);
                    if (!titleMatch) return;

                    const priceMatch = block.match(/\$(\d+(?:\.\d{2})?)/) || block.match(/current price\s*\$?(\d+(?:\.\d{2})?)/i);
                    if (!priceMatch) return;
                    const price = parseFloat(priceMatch[1]);

                    const imageMatch = block.match(/src="([^"]+walmartimages\.com[^"]+)"/i) || block.match(/srcset="([^"\s]+)/i);
                    
                    // Mobile Invariant Engine matching clean semantic strings natively
                    const ratingMatch = block.match(/([0-4]\.[0-9]|5\.0)\s*out of 5 stars/i) || 
                                       block.match(/([0-4]\.[0-9]|5\.0)\s*stars/i) || 
                                       block.match(/aria-label="([0-4]\.[0-9]|5\.0)\s*rating/i);
                                       
                    const countMatch = block.match(/aria-label="([0-9,]+)\s*reviews"/i) || 
                                     block.match(/data-automation-id="search-reviews"[^>]*>([0-9,]+)/i) ||
                                     block.match(/\(([0-9,]+)\)\s*<span/i);

                    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
                    const reviews = countMatch ? parseInt(countMatch[1].replace(/[^0-9]/g, ''), 10) : 0;

                    processItem({ title: titleMatch[1].replace(/<[^>]*>/g, '').trim(), product_id: id, price, image: imageMatch ? imageMatch[1] : "", rating, reviews }, 'walmart');
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
        console.warn(`[MULTI_PAGE_TIME_GATE_ALERT]: Processing finalized up to safe limit.`);
    }

    if (rawResults.length === 0) {
        return NextResponse.json([]);
    }

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
                score: numericPPU, 
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

        processedResults.sort((a: any, b: any) => {
            const valA = a.score || 0;
            const valB = b.score || 0;
            if (valA !== valB) return valA - valB;
            return (a.price || 0) - (b.price || 0);
        });

        return NextResponse.json(processedResults);
    } catch {
        return NextResponse.json(rawResults);
    }
}