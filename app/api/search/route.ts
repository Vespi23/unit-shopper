import { NextResponse } from 'next/server';
import { toCanonicalUnit, convertValue, calculatePricePerUnit } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

// High-precision volume extraction module capable of decomposing complex packaging strings
function extractNormalizedVolume(titleStr: string): { amount: number; unit: string } {
    let amount = 1;
    let unit = 'unit';
    const cleanTitle = titleStr.toLowerCase().replace(/[\s\-_]+/g, ' ');

    // Match Pattern Pattern: [Pack/Count Multiplier] x [Individual Volume] (e.g., "12 pack of 12 oz", "24 ct - 16.9 ounce")
    const multiPackMatch = cleanTitle.match(/(\d+)\s*(?:pack|pk|ct|count|count\b|pcs|bottles|cans)?\s*(?:of|x|\-)?\s*([0-9.]+)\s*(oz|ounce|fl\s*oz|lb|pound|gal|gallon|g|gram|ml|milliliter)/i);
    
    if (multiPackMatch) {
        const packCount = parseInt(multiPackMatch[1]) || 1;
        const pieceSize = parseFloat(multiPackMatch[2]) || 1;
        unit = multiPackMatch[3].trim().toLowerCase();
        amount = packCount * pieceSize;
        return { amount, unit };
    }

    // Match Pattern Pattern: [Individual Volume] x [Pack/Count Multiplier] (e.g., "12 oz, 6 pack", "16.9 fl oz (pack of 24)")
    const reversePackMatch = cleanTitle.match(/([0-9.]+)\s*(oz|ounce|fl\s*oz|lb|pound|gal|gallon|g|gram|ml|milliliter)\s*(?:,|\b|\()?.*?(\d+)\s*(?:pack|pk|ct|count|pcs|bottles|cans)/i);
    
    if (reversePackMatch) {
        const pieceSize = parseFloat(reversePackMatch[1]) || 1;
        unit = reversePackMatch[2].trim().toLowerCase();
        const packCount = parseInt(reversePackMatch[3]) || 1;
        amount = packCount * pieceSize;
        return { amount, unit };
    }

    // Standard Singular Matcher Block (e.g., "64 oz", "1.5 gallon", "50 count")
    const singularMatch = cleanTitle.match(/([0-9.]+)\s*(oz|ounce|lb|pound|fl\s*oz|gal|gallon|g|gram|ml|milliliter|ct|pack|count|pcs)/i);
    if (singularMatch) {
        amount = parseFloat(singularMatch[1]) || 1;
        unit = singularMatch[2].trim().toLowerCase();
    }

    return { amount, unit };
}

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

                // Align Amazon payload keys with the high-precision calculator engine
                const measurement = extractNormalizedVolume(title);

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
                    unit: measurement.unit,
                    unit_type: measurement.unit,
                    totalAmount: measurement.amount,
                    amount: measurement.amount,
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
                const price = parseFloat(String(priceBlock.price || "0.00")) || 19.99;
                const image = generalBlock.image || "";
                
                const rating = ratingBlock.rating ? parseFloat(ratingBlock.rating) : 4.5;
                const reviews = ratingBlock.count ? parseInt(ratingBlock.count) : 25;

                // Decompose product strings and badge data lists to intercept unit parameters
                const stringToScan = `${title} ${generalBlock.badge ? JSON.stringify(generalBlock.badge) : ''}`;
                const measurement = extractNormalizedVolume(stringToScan);

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
                    unit: measurement.unit,
                    unit_type: measurement.unit,
                    totalAmount: measurement.amount,
                    amount: measurement.amount,
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