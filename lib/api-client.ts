import { Product } from './types';
import { parseUnit, calculatePricePerUnit, normalizeUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

// --- CONSTANTS & PRE-COMPILED REGEXES ---
const EXACT_MATCH_QUERIES = new Set([
    'toilet paper',
    'paper towel',
    'paper towels'
]);

const ASIN_REGEX = /\/dp\/([A-Z0-9]{10})/;
const RATING_REGEX = /([0-9.]+) out of 5/;
const PPU_REGEX = /\(?\$([0-9.]+)\s*\/\s*([a-zA-Z\s.]+)\)?/i;

const searchCache = new Map<string, { data: Product[], timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; 

// --- AI TIE-BREAKER HELPER ---
async function verifyUnitsWithAI(products: any[]) {
    if (products.length === 0) return [];
    if (!process.env.GEMINI_API_KEY) return [];

    const CHUNK_SIZE = 15; 
    const chunks = [];
    
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
        chunks.push(products.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[AI TIE-BREAKER] Parallelizing ${chunks.length} chunks...`);

    const chunkPromises = chunks.map(async (chunk, index) => {
        const prompt = `You are a grocery math expert. I will provide a list of product titles.
        For each product:
        1. Identify if it's a "Pack" or "Case" (e.g., "10 Packets").
        2. Identify the weight listed ON THE BOX (e.g., "Net Wt 1.06 oz").
        3. Determine the TOTAL weight. 
        - CRITICAL: If the title says "Net Wt 1.06 oz (30g)", that is the TOTAL for the whole box. Do NOT multiply it again by the packet count.

        Return ONLY a JSON array: [{"id": "string", "verifiedTotal": number, "unit": "oz|fl oz|ct|lb"}]

        Products to analyze:
        ${chunk.map(p => `ID: ${p.id} | Title: ${p.title}`).join('\n')}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s for AI chunk

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                }),
                signal: controller.signal 
            });
            
            clearTimeout(timeoutId);

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) return [];

            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch (error: any) {
            clearTimeout(timeoutId);
            console.warn(`[AI TIE-BREAKER] Chunk ${index} failed or timed out.`);
            return [];
        }
    });

    const results = await Promise.all(chunkPromises);
    return results.flat();
}

// --- MAIN SEARCH FUNCTION ---
export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {
    const START_TIME = Date.now();
    const MAX_EXECUTION_TIME_MS = 54 * 1000; // 54s limit

    const MAX_QUERY_LENGTH = 100;
    const normalizedQuery = query.length > MAX_QUERY_LENGTH ? query.substring(0, MAX_QUERY_LENGTH) : query;
    const cacheKey = normalizedQuery.toLowerCase().trim();

    // 🛡️ CACHE CHECK
    const cachedData = searchCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL_MS) {
        console.log(`[CACHE HIT] Serving memory cache for: "${normalizedQuery}"`);
        return cachedData.data;
    }

    try {
        let apiSearchTerm = normalizedQuery;
        if (EXACT_MATCH_QUERIES.has(cacheKey) || (normalizedQuery.startsWith('"') && normalizedQuery.endsWith('"'))) {
            apiSearchTerm = `"${normalizedQuery.replace(/"/g, '')}"`;
        }

        const baseUrl = `https://www.amazon.com/s?k=${encodeURIComponent(apiSearchTerm)}`;
        
        const fetchPage = async (p: number): Promise<Product[]> => {
            const amazonUrl = p === 1 ? baseUrl : `${baseUrl}&page=${p}`;
            const decodoUrl = `https://scraper-api.decodo.com/v2/scrape`;
            
            try {
                const res = await fetch(decodoUrl, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`
                    },
                    body: JSON.stringify({ 
                        url: amazonUrl,
                        proxy_pool: "premium", 
                        proxy_type: "premium",
                        headless: "html"       
                    })
                });
                const json = await res.json();
                const html = json.results?.[0]?.content || json.content || json.body || null;
                return html ? parseAmazonHTML(html) : [];
            } catch (err) {
                console.error(`Page ${p} fetch error:`, err);
                return [];
            }
        };

        // 🚀 PARALLEL AGGRESSIVE SCRAPE
        // We fire all 7 pages at once with a tiny 150ms stagger to stay under the 10req/s limit.
        console.log(`[SCRAPER] Firing 7-page parallel scrape for "${apiSearchTerm}"...`);
        
        const pageNumbers = [1, 2, 3, 4, 5, 6, 7];
        const SCRAPE_TIMEOUT_MS = 35000; // If scrape isn't done in 35s, move on to what we have.

        const pagePromises = pageNumbers.map(p => {
            const delay = (p - 1) * 150; 
            return new Promise<Product[]>(async (resolve) => {
                await new Promise(r => setTimeout(r, delay));
                
                // Individual page timeout to prevent one hanging request from killing the search
                const timeout = setTimeout(() => resolve([]), SCRAPE_TIMEOUT_MS);
                const products = await fetchPage(p);
                clearTimeout(timeout);
                resolve(products);
            });
        });

        const settleResults = await Promise.allSettled(pagePromises);
        let allProducts: Product[] = [];
        
        settleResults.forEach(res => {
            if (res.status === 'fulfilled') allProducts = [...allProducts, ...res.value];
        });

        // Unique results
        const uniqueProductsMap = new Map<string, Product>();
        allProducts.forEach(product => {
            if (!uniqueProductsMap.has(product.id)) uniqueProductsMap.set(product.id, product);
        });
        let uniqueProducts = Array.from(uniqueProductsMap.values());

        // --- AI TIE-BREAKER ---
        uniqueProducts.sort((a, b) => (a.score ?? 999999) - (b.score ?? 999999));

        // Limit AI to top 15 to stay within free Gemini RPM (15)
        const AI_VERIFICATION_LIMIT = 15; 
        const highRisk = uniqueProducts.slice(0, AI_VERIFICATION_LIMIT);
        
        const timeElapsed = Date.now() - START_TIME;
        if (highRisk.length > 0 && timeElapsed < (MAX_EXECUTION_TIME_MS - 15000)) {
            console.log(`[AI TIE-BREAKER] Verifying top ${highRisk.length} items. Time elapsed: ${timeElapsed/1000}s`);
            const corrections = await verifyUnitsWithAI(highRisk);
            const correctionMap = new Map(corrections.map((c: any) => [c.id, c]));
            
            uniqueProducts = uniqueProducts.map(p => {
                const correction = correctionMap.get(p.id);
                if (correction) {
                    const totalVal = correction.verifiedTotal;
                    const unit = correction.unit;
                    const aiUnitInfo = { value: totalVal, unit, totalValue: totalVal, quantity: 1, formatted: `${totalVal} ${unit}` } as any;
                    const normalized = normalizeUnit(aiUnitInfo);
                    p.unit = unit;
                    p.totalAmount = totalVal;
                    p.amount = totalVal;
                    p.score = p.price / (normalized.totalValue || totalVal);
                    p.pricePerUnit = calculatePricePerUnit(p.price, totalVal, unit);
                    p.aiVerified = true; 
                }
                return p;
            });
        }

        const filteredResults = uniqueProducts.filter(p => (p.rating ?? 0) >= 4 && p.price > 0);
        filteredResults.sort((a, b) => (a.score ?? 999999) - (b.score ?? 999999));

        searchCache.set(cacheKey, { data: filteredResults, timestamp: Date.now() });

        console.log(`✅ Search Complete in ${(Date.now() - START_TIME)/1000}s. Returning ${filteredResults.length} items.`);
        return filteredResults;

    } catch (error) {
        console.error('Search Error:', error);
        return [];
    }
}

// --- HTML PARSER ---
function parseAmazonHTML(html: string): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];

    $('div[data-component-type="s-search-result"]').each((i, element) => {
        const item = $(element);
        const asin = item.attr('data-asin') || item.find('h2 a').attr('href')?.match(ASIN_REGEX)?.[1] || `idx-${i}`; 

        let title = item.find('h2 a span, h2 span, span.a-text-normal').first().text().trim();
        if (!title) return;

        let price = 0;
        const priceText = item.find('.a-price span.a-offscreen').first().text().replace(/[\$,]/g, '').trim();
        if (priceText) price = parseFloat(priceText);

        const image = item.find('img.s-image').attr('src') || '';
        const ratingText = item.find('i[data-cy="reviews-ratings-slot"] span.a-icon-alt, span[aria-label*="out of 5 stars"]').first().text();
        const ratingMatch = ratingText.match(RATING_REGEX);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

        const reviewsText = item.find('span.a-size-base.s-underline-text').first().text().replace(/[,()]/g, '');
        const reviews = parseInt(reviewsText, 10) || 0;
        const link = getAmazonAffiliateLink(asin);

        let amazonPpu = 0;
        let amazonUnit = '';
        item.find('.a-size-base.a-color-secondary, .a-color-price').each((_, el) => {
            const match = $(el).text().trim().match(PPU_REGEX);
            if (match && !amazonPpu) {
                amazonPpu = parseFloat(match[1]);
                amazonUnit = match[2].trim().toLowerCase();
            }
        });

        let unitInfo = (amazonPpu > 0 && price > 0) 
            ? { value: parseFloat((price / amazonPpu).toFixed(2)), unit: amazonUnit.replace(/\./g, ''), totalValue: parseFloat((price / amazonPpu).toFixed(2)), quantity: 1, formatted: `${parseFloat((price / amazonPpu).toFixed(2))} ${amazonUnit}` }
            : parseUnit(title);

        if (unitInfo) {
            if (unitInfo.unit.includes('fl oz')) unitInfo.unit = 'fl oz';
            else if (unitInfo.unit.includes('oz')) unitInfo.unit = 'oz';
            else if (unitInfo.unit.includes('lb')) unitInfo.unit = 'lb';
            else if (unitInfo.unit.includes('count') || unitInfo.unit.includes('ct')) unitInfo.unit = 'ct';
        }

        const totalValue = unitInfo?.totalValue || 0;
        const unit = unitInfo?.unit || 'unknown';
        const score = totalValue > 0 ? (normalizeUnit(unitInfo as any).totalValue ? price / normalizeUnit(unitInfo as any).totalValue : price / totalValue) : price;

        products.push({
            id: asin, title, price, image, source: 'Amazon', rating, reviews,
            unit, amount: unitInfo?.value || 0, totalAmount: totalValue,
            pricePerUnit: calculatePricePerUnit(price, totalValue, unit),
            link, currency: 'USD', originalPrice: 0, score, unitInfo: unitInfo as any
        });
    });
    return products;
}