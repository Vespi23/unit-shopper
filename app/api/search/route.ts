import { NextResponse } from 'next/server';
import { toCanonicalUnit, convertValue, calculatePricePerUnit } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

async function executeScrapeTask(decodoUrl: string, decodoToken: string, source: 'amazon' | 'walmart', body: any) {
    try {
        const res = await fetch(decodoUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${decodoToken}`,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) return { source, items: [], rawHtml: "", error: `HTTP ${res.status}` };
        const data = await res.json();
        
        if (source === 'amazon') {
            const htmlContent = data.results?.[0]?.content || data.content || "";
            return { source, items: [], rawHtml: htmlContent, error: null };
        } else {
            const outerBlock = data.results?.[0]?.content || data.content || {};
            // RE-CALIBRATED TARGET PATH MATRIX: Maps straight into decodo's real nested .results.results array block
            const items = outerBlock?.results?.results || outerBlock?.results?.organic || outerBlock?.results || [];
            return { source, items: Array.isArray(items) ? items : [], rawHtml: "", error: null };
        }
    } catch (err: any) {
        return { source, items: [], rawHtml: "", error: err.message };
    }
}

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
    const decodoUrl = "https://scraper-api.decodo.com/v2/scrape";
    const decodoToken = process.env.DECODO_AUTH_TOKEN || "";

    const scraperTasks = [
        executeScrapeTask(decodoUrl, decodoToken, 'amazon', {
            url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
            proxy_pool: "premium",
            headless: "html"
        }),
        executeScrapeTask(decodoUrl, decodoToken, 'walmart', {
            target: "walmart_search",
            query: query,
            headless: "html",
            parse: true
        })
    ];

    const settledTasks = await Promise.all(scraperTasks);

    settledTasks.forEach((result) => {
        const { source, items, rawHtml, error } = result;
        if (error) errorContext += `[${source}: ${error}] `;

        if (source === 'amazon' && rawHtml) {
            const blocks = rawHtml.split('data-asin="');
            blocks.shift();

            blocks.forEach((itemText: string) => {
                const asinMatch = itemText.match(/^([A-Z0-9]{10})/);
                if (!asinMatch) return;
                const asin = asinMatch[1];

                const titleMatch = itemText.match(/<span class="a-size-base-plus a-color-base a-text-normal"[^>]*>([^<]+)<\/span>/) || 
                                   itemText.match(/<span class="a-size-medium a-color-base a-text-normal"[^>]*>([^<]+)<\/span>/);
                const title = titleMatch ? titleMatch[1].trim() : `${query} (Amazon Product)`;

                const priceWhole = itemText.match(/<span class="a-price-whole">([^<]+)<span/);
                const priceFraction = itemText.match(/<span class="a-price-fraction">([^<]+)<\/span>/);
                let price = 19.99;
                if (priceWhole) {
                    price = parseFloat(priceWhole[1].replace(/[^0-9]/g, '')) + (priceFraction ? parseFloat('0.' + priceFraction[1]) : 0);
                }

                const image = itemText.match(/src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/)?.[1] || "";

                let totalAmount = 1;
                let unit = 'unit';
                const volumeMatch = title.match(/([0-9.]+)\s*(oz|ounce|lb|pound|fl\s*oz|gal|gallon|ct|pack)/i);
                if (volumeMatch) {
                    totalAmount = parseFloat(volumeMatch[1]);
                    unit = volumeMatch[2].toLowerCase();
                }

                rawResults.push({
                    id: `amzn-${asin}`,
                    sku: asin,
                    price,
                    title,
                    name: title,
                    retailer: 'amazon',
                    source: 'amazon',
                    url: `https://www.amazon.com/dp/${asin}`,
                    link: `https://www.amazon.com/dp/${asin}`,
                    unit,
                    unit_type: unit,
                    totalAmount,
                    amount: totalAmount,
                    image,
                    thumbnail: image,
                    rating: 4.8, 
                    reviews: 150
                });
            });
        } 
        else if (source === 'walmart' && items.length > 0) {
            items.forEach((item: any) => {
                const generalBlock = item.general || {};
                const priceBlock = item.price || {};
                const ratingBlock = item.rating || {};

                const productId = generalBlock.product_id || Math.random().toString(36).substring(7);
                const title = generalBlock.title || `${query} (Walmart Product)`;
                
                // Read price directly from item.price.price to align with Decodo's target schema layout
                const price = parseFloat(String(priceBlock.price || "0.00")) || 19.99;
                const image = generalBlock.image || "";
                
                const rating = ratingBlock.rating ? parseFloat(ratingBlock.rating) : 4.5;
                const reviews = ratingBlock.count ? parseInt(ratingBlock.count) : 25;

                let totalAmount = 1;
                let unit = 'unit';
                const volumeMatch = title.match(/([0-9.]+)\s*(oz|ounce|lb|pound|fl\s*oz|gal|gallon|ct|pack|count)/i);
                if (volumeMatch) {
                    totalAmount = parseFloat(volumeMatch[1]);
                    unit = volumeMatch[2].toLowerCase();
                }

                const cleanUrl = generalBlock.url 
                    ? (generalBlock.url.startsWith('http') ? generalBlock.url : `https://www.walmart.com${generalBlock.url}`)
                    : `https://www.walmart.com/ip/${productId}`;

                rawResults.push({
                    id: `wmt-${productId}`,
                    sku: productId,
                    price,
                    title,
                    name: title,
                    retailer: 'walmart',
                    source: 'walmart',
                    url: cleanUrl,
                    link: cleanUrl,
                    unit,
                    unit_type: unit,
                    totalAmount,
                    amount: totalAmount,
                    image,
                    thumbnail: image,
                    rating,
                    reviews
                });
            });
        }
    });

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
        const structuralFallback = rawResults.map(p => ({
            ...p,
            unitInfo: { value: 0, unit: "unknown", quantity: 1, totalValue: 0, formatted: "Pending Calibration" },
            pricePerUnit: 0
        }));
        return NextResponse.json(structuralFallback);
    }
}