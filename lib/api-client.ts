import { Product } from './types';
import { parseUnit, calculatePricePerUnit, normalizeUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; 
const searchCache = new Map<string, { timestamp: number, data: Product[] }>();

const EXACT_MATCH_QUERIES = new Set([
    'toilet paper',
    'paper towel',
    'paper towels'
]);

export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {
    const MAX_QUERY_LENGTH = 100;
    if (query.length > MAX_QUERY_LENGTH) {
        console.warn(`Query truncated from ${query.length} to ${MAX_QUERY_LENGTH} chars`);
        query = query.substring(0, MAX_QUERY_LENGTH);
    }

    const cacheKey = `${query.toLowerCase().trim()}-multi-v13-decodo`;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
        console.log(`[CACHE HIT] Serving results for: ${query} (Multi-page)`);
        return cached.data;
    }

    try {
        console.log(`[API CALL] Fetching Decodo Web Scraping API for: ${query}`);

        let apiSearchTerm = query;
        let isExactMatch = false;

        if (EXACT_MATCH_QUERIES.has(query.toLowerCase().trim())) {
            apiSearchTerm = `"${query}"`;
            isExactMatch = true;
            console.log(`[API EXACT MATCH] Pre-wrapping known noisy query: ${apiSearchTerm}`);
        } else if (query.startsWith('"') && query.endsWith('"')) {
            isExactMatch = true;
        }

        const getBaseUrl = (term: string) => `https://www.amazon.com/s?k=${encodeURIComponent(term)}`;

        const fetchPage = async (p: number, urlBase: string): Promise<string | null> => {
            const amazonUrl = p === 1 ? urlBase : `${urlBase}&page=${p}`;
            const decodoUrl = `https://scraper-api.decodo.com/v2/scrape`;
            try {
                const res = await fetch(decodoUrl, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`
                    },
                    body: JSON.stringify({ url: amazonUrl })
                });
                if (!res.ok) throw new Error(`Decodo API failed with status ${res.status}`);
                const json = await res.json();
                if (json && json.results && json.results.length > 0 && json.results[0].content) {
                    return json.results[0].content;
                }
                if (json && json.content) return json.content;
                if (json && json.body) return json.body;
                return json; 
            } catch (err) {
                console.error(`Page ${p} fetch error:`, err);
                return null;
            }
        };

        let baseUrl = getBaseUrl(apiSearchTerm);
        console.log(`[API CALL] Fetching Page 1 for term: ${apiSearchTerm}`);
        let firstPageHtml = await fetchPage(1, baseUrl);
        let firstPageProducts = firstPageHtml ? parseAmazonHTML(firstPageHtml) : [];

        if (firstPageProducts.length === 0 && !isExactMatch) {
            console.log(`[API FALLBACK] 0 products parsed for raw query. Retrying exactly: "${apiSearchTerm}"`);
            apiSearchTerm = `"${query}"`;
            baseUrl = getBaseUrl(apiSearchTerm);
            firstPageHtml = await fetchPage(1, baseUrl);
            firstPageProducts = firstPageHtml ? parseAmazonHTML(firstPageHtml) : [];
        }

        let allProducts: Product[] = [...firstPageProducts];
        console.log(`Page 1: Found ${firstPageProducts.length} products`);

        if (allProducts.length > 0) {
            console.log(`[API CALL] Fetching Pages 2-3 concurrently...`);
            const pagePromises = [
                fetchPage(2, baseUrl),
                fetchPage(3, baseUrl)
            ];

            const htmlResults = await Promise.all(pagePromises);
            htmlResults.forEach((html, index) => {
                const pageNum = index + 2;
                if (html) {
                    const parsedProducts = parseAmazonHTML(html as string);
                    allProducts = [...allProducts, ...parsedProducts];
                    console.log(`Page ${pageNum}: Found ${parsedProducts.length} products`);
                }
            });
        }
        
        const uniqueProductsMap = new Map<string, Product>();
        allProducts.forEach(product => {
            if (!uniqueProductsMap.has(product.id)) {
                uniqueProductsMap.set(product.id, product);
            }
        });
        const uniqueProducts = Array.from(uniqueProductsMap.values());

        const filteredResults = uniqueProducts.filter((product: Product) => {
            if (product.rating === undefined || product.rating < 4) return false;
            if (product.price === 0) return false;
            return true;
        });

        filteredResults.sort((a, b) => (a.score ?? 999999) - (b.score ?? 999999));

        console.log(`[API STATS] Decodo fetched -> ${allProducts.length} raw parsed -> ${filteredResults.length} filtered (4+ stars)`);

        if (filteredResults.length > 0) {
            searchCache.set(cacheKey, {
                timestamp: Date.now(),
                data: filteredResults
            });
        }

        return filteredResults;

    } catch (error) {
        console.error('Error fetching from Decodo:', error);
        if (cached) {
            return cached.data;
        }
        return [];
    }
}

function parseAmazonHTML(html: string): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];

    $('div[data-component-type="s-search-result"]').each((i, element) => {
        const item = $(element);

        const asin = item.attr('data-asin') || String(Math.random());

        let title = item.find('h2 a span').text().trim();
        if (!title) title = item.find('h2 span').text().trim();
        if (!title) title = item.find('span.a-text-normal').text().trim();

        if (!title) return; 

        let price = 0;
        const priceElement = item.find('.a-price span.a-offscreen').first();
        if (priceElement.length > 0) {
            const priceText = priceElement.text();
            const cleanedPriceText = priceText.replace(/[\$,]/g, '').trim();
            const parsedPrice = parseFloat(cleanedPriceText);
            if (!isNaN(parsedPrice)) {
                price = parsedPrice;
            }
        }

        const imageElement = item.find('img.s-image').first();
        const image = imageElement.attr('src') || '';

        let rating = 0;
        const ratingElement = item.find('i[data-cy="reviews-ratings-slot"] span.a-icon-alt, span[aria-label*="out of 5 stars"]').first();
        if (ratingElement.length > 0) {
            const ratingText = ratingElement.text() || ratingElement.attr('aria-label') || '';
            const ratingMatch = ratingText.match(/([0-9.]+) out of 5/);
            if (ratingMatch && ratingMatch[1]) {
                rating = parseFloat(ratingMatch[1]);
            }
        }

        let reviews = 0;
        const reviewsElement = item.find('span.a-size-base.s-underline-text').first();
        if (reviewsElement.length > 0) {
            const parseNum = parseInt(reviewsElement.text().replace(/[,()]/g, ''), 10);
            if (!isNaN(parseNum)) {
                reviews = parseNum;
            }
        }

        const link = getAmazonAffiliateLink(asin);

        // ==========================================
        // NEW: THE AMAZON MATH OVERRIDE
        // ==========================================
        let amazonPpu = 0;
        let amazonUnit = '';

        // Scrape the grey secondary text for "($1.10 / Ounce)"
        item.find('.a-size-base.a-color-secondary, .a-color-price').each((_, el) => {
            const text = $(el).text().trim();
            const match = text.match(/\(?\$([0-9.]+)\s*\/\s*([a-zA-Z\s.]+)\)?/i);
            if (match && !amazonPpu) {
                amazonPpu = parseFloat(match[1]);
                amazonUnit = match[2].trim().toLowerCase();
            }
        });

        let unitInfo = null;
        
        if (amazonPpu > 0 && amazonUnit && price > 0) {
            // Reverse engineer the total amount from Amazon's explicit math!
            const calculatedTotal = parseFloat((price / amazonPpu).toFixed(2));
            
            // Map Amazon's raw string to your standardized units
            let mappedUnit = amazonUnit.replace(/\./g, ''); // Remove periods like Fl. Oz.
            if (mappedUnit.includes('fl oz') || mappedUnit.includes('fluid')) mappedUnit = 'fl oz';
            else if (mappedUnit.includes('oz') || mappedUnit.includes('ounce')) mappedUnit = 'oz';
            else if (mappedUnit.includes('lb') || mappedUnit.includes('pound')) mappedUnit = 'lb';
            else if (mappedUnit.includes('count') || mappedUnit.includes('item') || mappedUnit.includes('ct')) mappedUnit = 'ct';

            // Create a fake unitInfo object so the rest of the app doesn't break
            unitInfo = {
                value: calculatedTotal,
                unit: mappedUnit,
                totalValue: calculatedTotal,
                quantity: 1, // <-- ADDED: Satisfies TypeScript requirement
                formatted: `${calculatedTotal} ${mappedUnit}` // <-- ADDED: Satisfies TypeScript requirement
            } as any;
            // console.log(`[AMAZON MATH] ${asin}: Bypassed Regex. Used $${amazonPpu}/${mappedUnit}`);
        } else {
            // FALLBACK: If Amazon hides the unit price, use your Regex parser on the Title
            unitInfo = parseUnit(title);
        }
        // ==========================================

        let pricePerUnit = 'N/A';
        let unit: any = 'unknown';
        let value = 0;
        let totalValue = 0;

        if (unitInfo) {
            unit = unitInfo.unit;
            value = unitInfo.value;
            totalValue = unitInfo.totalValue;
            pricePerUnit = calculatePricePerUnit(price, unitInfo.totalValue, unitInfo.unit);
        }

        let score = 999999;
        if (unitInfo && price > 0) {
            const normalized = normalizeUnit(unitInfo);
            if (normalized.totalValue > 0) {
                score = price / normalized.totalValue;
            }
        } else if (price > 0 && totalValue > 0) {
            score = price / totalValue;
        } else if (price > 0) {
            score = price;
        }

        products.push({
            id: asin,
            title,
            price,
            image,
            source: 'Amazon',
            rating,
            reviews,
            unit,
            amount: value,
            totalAmount: totalValue,
            pricePerUnit,
            link,
            currency: 'USD',
            originalPrice: 0,
            score,
            unitInfo: unitInfo || undefined
        });
    });

    return products;
}
// Add this helper function at the bottom of lib/api-client.ts
async function verifyUnitsWithAI(products: any[]) {
    if (products.length === 0) return [];

    const prompt = `
    You are a grocery data expert. I will give you a list of Amazon product titles and prices.
    Extract the TRUE TOTAL units (e.g., total ounces, total count) even if the title is poorly formatted.
    
    Rules:
    1. For "10 packets, 1.1 Oz", if 1.1 Oz is likely the total weight, return 1.1.
    2. If price is high (e.g. $50) but weight is low (1oz), look for a missed "Pack of X".
    3. Return ONLY a JSON array: [{"id": "string", "verifiedTotal": number, "unit": "oz|fl oz|ct|lb"}]
    
    Products:
    ${products.map(p => `ID: ${p.id} | Title: ${p.title} | Price: $${p.price}`).join('\n')}
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        const resultText = data.candidates[0].content.parts[0].text;
        return JSON.parse(resultText);
    } catch (error) {
        console.error("AI Tie-Breaker Failed:", error);
        return [];
    }
}

// Update your searchProducts function logic
export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {
    // ... (Keep your existing Cache and Fetch logic at the top)

    try {
        // ... (Keep your existing Page Fetching logic)

        let allProducts: Product[] = [...firstPageProducts];
        // ... (Keep your existing Concurrent Page Fetching)

        // Ensure unique results
        const uniqueProductsMap = new Map<string, Product>();
        allProducts.forEach(product => {
            if (!uniqueProductsMap.has(product.id)) uniqueProductsMap.set(product.id, product);
        });
        let uniqueProducts = Array.from(uniqueProductsMap.values());

        // ==========================================
        // NEW: AI TIE-BREAKER INTEGRATION
        // ==========================================
        // Identify "High Risk" items (Suspect PPU > $50 or unknown units)
        const highRisk = uniqueProducts.filter(p => p.score > 50 || p.unit === 'unknown');
        
        if (highRisk.length > 0) {
            console.log(`[AI TIE-BREAKER] Verifying ${highRisk.length} high-risk products...`);
            const corrections = await verifyUnitsWithAI(highRisk);
            
            uniqueProducts = uniqueProducts.map(p => {
                const correction = corrections.find((c: any) => c.id === p.id);
                if (correction) {
                    const totalVal = correction.verifiedTotal;
                    const unit = correction.unit;
                    
                    // Create a pseudo-unitInfo for normalization
                    const aiUnitInfo = {
                        value: totalVal,
                        unit: unit,
                        totalValue: totalVal,
                        quantity: 1,
                        formatted: `${totalVal} ${unit}`
                    } as any;

                    const normalized = normalizeUnit(aiUnitInfo);
                    p.unit = unit;
                    p.totalAmount = totalVal;
                    p.amount = totalVal;
                    p.score = p.price / (normalized.totalValue || totalVal);
                    p.pricePerUnit = calculatePricePerUnit(p.price, totalVal, unit);
                }
                return p;
            });
        }
        // ==========================================

        const filteredResults = uniqueProducts.filter((product: Product) => {
            if (product.rating === undefined || product.rating < 4) return false;
            if (product.price === 0) return false;
            return true;
        });

        filteredResults.sort((a, b) => (a.score ?? 999999) - (b.score ?? 999999));

        // ... (Keep Cache Saving and Return logic)

    } catch (error) {
        // ... (Keep Error handling)
    }
}