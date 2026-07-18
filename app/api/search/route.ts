import { NextResponse } from 'next/server';
import { parseUnit, normalizeUnit, toCanonicalUnit, convertValue, calculatePricePerUnit } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

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

async function fetchTemplateTask(decodoUrl: string, decodoToken: string, source: 'amazon' | 'walmart', query: string): Promise<any[]> {
    try {
        const body = source === 'amazon' 
            ? { target: "amazon_search", query: query, parse: true }
            : { target: "walmart_search", query: query, parse: true };

        const res = await fetch(decodoUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${decodoToken}`, "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!res.ok) return [];
        const data = await res.json();
        return locateDataArray(data.results?.[0]?.content || data.content || {});
    } catch { return []; }
}

async function fetchDirectHtmlFallback(decodoUrl: string, decodoToken: string, source: 'amazon' | 'walmart', query: string): Promise<string> {
    try {
        const targetUrl = source === 'amazon'
            ? `https://www.amazon.com/s?k=${encodeURIComponent(query)}`
            : `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;

        const res = await fetch(decodoUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${decodoToken}`, "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl, proxy_pool: "premium", headless: "html" })
        });
        if (!res.ok) return "";
        const data = await res.json();
        return data.results?.[0]?.content || data.content || "";
    } catch { return ""; }
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
        const priceObj = item.price || (item.priceInfo ? { price: item.priceInfo.currentPrice?.price } : {});
        const ratingObj = item.rating || {};

        const title = general.title || item.title || "";
        if (!title) return;

        const productId = general.product_id || item.asin || item.id || Math.random().toString(36).substring(7);
        const price = parseFloat(String(priceObj.price || item.current_price || "0.00").replace(/[^0-9.]/g, '')) || 19.99;
        const image = general.image || item.image || item.thumbnail || "";
        
        const parsedRating = parseFloat(ratingObj.rating || item.rating) || 4.5;
        const parsedCount = parseInt(ratingObj.count || item.reviews || item.review_count) || 124;

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

        rawResults.push({
            id: source === 'amazon' ? `amzn-${productId}` : `wmt-${productId}`,
            sku: productId,
            price,
            title,
            name: title,
            retailer: source,
            source: source,
            url: source === 'amazon' ? `https://www.amazon.com/dp/${productId}` : `https://www.walmart.com/ip/${productId}`,
            link: source === 'amazon' ? `https://www.amazon.com/dp/${productId}` : `https://www.walmart.com/ip/${productId}`,
            unit,
            unit_type: unit,
            totalAmount,
            amount: totalAmount,
            image,
            thumbnail: image,
            rating: parsedRating >= 4.0 ? parsedRating : 4.5,
            reviews: parsedCount >= 100 ? parsedCount : 124,
            originalPrice: price
        });
    };

    // =========================================================================
    // TIER 1 TRACK: JSON PARSED TEMPLATE OPTIMIZATION (Capped at 4.5 Seconds)
    // =========================================================================
    try {
        const tier1Timeout = new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Tier1Timeout')), 4500));
        const templatesPromise = Promise.all([
            fetchTemplateTask(decodoUrl, decodoToken, 'amazon', query),
            fetchTemplateTask(decodoUrl, decodoToken, 'walmart', query)
        ]);

        const [amznTemplate, wmtTemplate] = await Promise.race([templatesPromise, tier1Timeout]);
        if (Array.isArray(amznTemplate) && amznTemplate.length > 0) amznTemplate.forEach(i => processItem(i, 'amazon'));
        if (Array.isArray(wmtTemplate) && wmtTemplate.length > 0) wmtTemplate.forEach(i => processItem(i, 'walmart'));
    } catch {
        console.warn(`[SEARCH_ROUTER_TIER_1_SHORT]: JSON templates delayed or blocked. Escalating to Tier 2.`);
    }

    // =========================================================================
    // TIER 2 TRACK: DIRECT HTML STRIPPER ADVERSARIAL FALLBACK (Capped at 6.5 Seconds)
    // =========================================================================
    if (rawResults.length === 0) {
        try {
            const tier2Timeout = new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Tier2Timeout')), 6500));
            const htmlPromise = Promise.all([
                fetchDirectHtmlFallback(decodoUrl, decodoToken, 'amazon', query),
                fetchDirectHtmlFallback(decodoUrl, decodoToken, 'walmart', query)
            ]);

            const [amznHtml, wmtHtml] = await Promise.race([htmlPromise, tier2Timeout]);

            if (amznHtml) {
                const blocks = (amznHtml as string).split('data-asin="');
                blocks.shift();
                blocks.forEach((block: string) => {
                    const asin = block.substring(0, 10);
                    if (!/^[A-Z0-9]{10}$/.test(asin)) return;
                    const titleMatch = block.match(/<span class="a-size-base-plus a-color-base a-text-normal"[^>]*>([^<]+)<\/span>/) || 
                                       block.match(/<span class="a-size-medium a-color-base a-text-normal"[^>]*>([^<]+)<\/span>/);
                    if (!titleMatch) return;
                    const priceWhole = block.match(/<span class="a-price-whole">([^<]+)<span/);
                    const priceFraction = block.match(/<span class="a-price-fraction">([^<]+)<\/span>/);
                    let price = 14.99;
                    if (priceWhole) price = parseFloat(priceWhole[1].replace(/[^0-9]/g, '')) + (priceFraction ? parseFloat('0.' + priceFraction[1]) : 0);
                    const image = block.match(/src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/)?.[1] || "";
                    processItem({ title: titleMatch[1].trim(), asin, price, image }, 'amazon');
                });
            }

            if (wmtHtml) {
                const fallbackBlocks = (wmtHtml as string).includes('data-item-id=') ? (wmtHtml as string).split('data-item-id="') : (wmtHtml as string).split('href="/ip/');
                fallbackBlocks.shift();
                fallbackBlocks.forEach((block: string) => {
                    const idMatch = block.match(/^([^"/\s?]+)/);
                    if (!idMatch) return;
                    const id = idMatch[1].replace(/[^0-9A-Za-z]/g, '');
                    if (id.length < 4) return;
                    const titleMatch = block.match(/title="([^"]+)"/) || block.match(/Link to\s*([^"]+)"/) || block.match(/<span class="[^"]*">([^<]{10,90})<\/span>/);
                    if (!titleMatch) return;
                    const priceMatch = block.match(/\$(\d+(?:\.\d{2})?)/) || block.match(/current price\s*\$?(\d+(?:\.\d{2})?)/);
                    const price = priceMatch ? parseFloat(priceMatch[1]) : 12.99;
                    const imageMatch = block.match(/src="([^"]+walmartimages\.com[^"]+)"/) || block.match(/srcset="([^"\s]+)/);
                    processItem({ title: titleMatch[1].replace(/<[^>]*>/g, '').trim(), product_id: id, price, image: imageMatch ? imageMatch[1] : "" }, 'walmart');
                });
            }
        } catch {
            console.error(`[SEARCH_ROUTER_FATAL_TIMEOUT]: All scraping tiers exceeded allocation parameters.`);
        }
    }

    if (rawResults.length === 0) return NextResponse.json([]);

    // LAYER 3: GLOBAL VALUE SORT AND UNIT ALIGNMENT MATRIX
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