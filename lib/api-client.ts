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

// Compiling these once at startup saves massive CPU cycles during HTML parsing
const ASIN_REGEX = /\/dp\/([A-Z0-9]{10})/;
const RATING_REGEX = /([0-9.]+) out of 5/;
const PPU_REGEX = /\(?\$([0-9.]+)\s*\/\s*([a-zA-Z\s.]+)\)?/i;

// --- AI TIE-BREAKER HELPER ---
async function verifyUnitsWithAI(products: any[]) {
    if (products.length === 0) return [];
    if (!process.env.GEMINI_API_KEY) return [];

    const CHUNK_SIZE = 30; // Slightly larger chunks
    const chunks = [];
    
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
        chunks.push(products.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[AI TIE-BREAKER] Parallelizing ${chunks.length} chunks...`);

    // RUN ALL CHUNKS AT ONCE
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

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) return [];

            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch (error) {
            console.error(`Chunk ${index} failed:`, error);
            return [];
        }
    });

    const results = await Promise.all(chunkPromises);
    const allCorrections = results.flat();

    console.log(`✅ Parallel AI verification complete. Received ${allCorrections.length} corrections.`);
    return allCorrections;
}

// --- MAIN SEARCH FUNCTION ---
export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {
    const MAX_QUERY_LENGTH = 100;
    if (query.length > MAX_QUERY_LENGTH) {
        query = query.substring(0, MAX_QUERY_LENGTH);
    }

    try {
        let apiSearchTerm = query;
        let isExactMatch = false;

        if (EXACT_MATCH_QUERIES.has(query.toLowerCase().trim())) {
            apiSearchTerm = `"${query}"`;
            isExactMatch = true;
        } else if (query.startsWith('"') && query.endsWith('"')) {
            isExactMatch = true;
        }

        const getBaseUrl = (term: string) => `https://www.amazon.com/s?k=${encodeURIComponent(term)}`;

        const fetchPage = async (p: number, urlBase: string): Promise<string | null> => {
            const amazonUrl = p === 1 ? urlBase : `${urlBase}&page=${p}`;
            const decodoUrl = `https://scraper-api.decodo.com/v2/scrape`;
            try {
                // Stagger requests slightly to prevent hammering Decodo at the exact same millisecond
                if (p > 1) await new Promise(res => setTimeout(res, (p - 1) * 200));

                const res = await fetch(decodoUrl, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`
                    },
                    body: JSON.stringify({ url: amazonUrl })
                });
                const json = await res.json();
                return json.results?.[0]?.content || json.content || json.body || null;
            } catch (err) {
                console.error(`Page ${p} fetch error:`, err);
                return null;
            }
        };

        // Fetch Page 1
        let baseUrl = getBaseUrl(apiSearchTerm);
        let firstPageHtml: string | null = await fetchPage(1, baseUrl);
        let firstPageProducts = firstPageHtml ? parseAmazonHTML(firstPageHtml) : [];
        
        // 🧹 GARBAGE COLLECTION: Free Page 1 RAM
        firstPageHtml = null;

        // Fallback if empty
        if (firstPageProducts.length === 0 && !isExactMatch) {
            apiSearchTerm = `"${query}"`;
            baseUrl = getBaseUrl(apiSearchTerm);
            firstPageHtml = await fetchPage(1, baseUrl);
            firstPageProducts = firstPageHtml ? parseAmazonHTML(firstPageHtml) : [];
            
            // 🧹 GARBAGE COLLECTION: Free Fallback Page RAM
            firstPageHtml = null;
        }

        let allProducts: Product[] = [...firstPageProducts];

        // Fetch up to 7 pages concurrently
        if (allProducts.length > 0) {
            const MAX_PAGES = 7;
            const pagePromises = [];
            
            console.log(`[SCRAPER] Fetching pages 2 through ${MAX_PAGES} concurrently...`);
            for (let p = 2; p <= MAX_PAGES; p++) {
                pagePromises.push(fetchPage(p, baseUrl));
            }

            // allSettled ensures we process successful pages even if some timeout
            const results = await Promise.allSettled(pagePromises);
            
            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value) {
                    allProducts = [...allProducts, ...parseAmazonHTML(result.value)];
                    
                    // 🧹 GARBAGE COLLECTION: Destroy the 1MB+ HTML string from memory 
                    // the millisecond we are done extracting the products from it.
                    result.value = null as any;
                }
            });
        }

        // Ensure unique results
        const uniqueProductsMap = new Map<string, Product>();
        allProducts.forEach(product => {
            if (!uniqueProductsMap.has(product.id)) uniqueProductsMap.set(product.id, product);
        });
        let uniqueProducts = Array.from(uniqueProductsMap.values());

        // --- AI TIE-BREAKER INTEGRATION ---
        
        // 1. Pre-sort before AI to ensure the AI focuses on the most promising products
        uniqueProducts.sort((a, b) => (a.score ?? 999999) - (b.score ?? 999999));

        // 2. Limit AI verification to the top 60 to prevent 60-second timeouts & Gemini Rate Limits
        const AI_VERIFICATION_LIMIT = 60;
        const highRisk = uniqueProducts.slice(0, AI_VERIFICATION_LIMIT);
        
        if (highRisk.length > 0) {
            console.log(`[AI TIE-BREAKER] Verifying top ${highRisk.length} products...`);
            const corrections = await verifyUnitsWithAI(highRisk);
            
            // O(1) Lookup Map to prevent nested looping through 20,000+ combinations
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

        // Final sort and filter
        const filteredResults = uniqueProducts.filter(p => (p.rating ?? 0) >= 4 && p.price > 0);
        filteredResults.sort((a, b) => (a.score ?? 999999) - (b.score ?? 999999));

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
        
        // Use pre-compiled ASIN_REGEX
        const asin = item.attr('data-asin') || 
                     item.find('h2 a').attr('href')?.match(ASIN_REGEX)?.[1] || 
                     `idx-${i}`; 

        let title = item.find('h2 a span, h2 span, span.a-text-normal').first().text().trim();
        if (!title) return;

        let price = 0;
        const priceText = item.find('.a-price span.a-offscreen').first().text().replace(/[\$,]/g, '').trim();
        if (priceText) price = parseFloat(priceText);

        const image = item.find('img.s-image').attr('src') || '';
        
        // Use pre-compiled RATING_REGEX
        const ratingText = item.find('i[data-cy="reviews-ratings-slot"] span.a-icon-alt, span[aria-label*="out of 5 stars"]').first().text();
        const ratingMatch = ratingText.match(RATING_REGEX);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

        const reviewsText = item.find('span.a-size-base.s-underline-text').first().text().replace(/[,()]/g, '');
        const reviews = parseInt(reviewsText, 10) || 0;

        const link = getAmazonAffiliateLink(asin);

        let amazonPpu = 0;
        let amazonUnit = '';
        item.find('.a-size-base.a-color-secondary, .a-color-price').each((_, el) => {
            // Use pre-compiled PPU_REGEX
            const match = $(el).text().trim().match(PPU_REGEX);
            if (match && !amazonPpu) {
                amazonPpu = parseFloat(match[1]);
                amazonUnit = match[2].trim().toLowerCase();
            }
        });

        let unitInfo = null;
        if (amazonPpu > 0 && price > 0) {
            const total = parseFloat((price / amazonPpu).toFixed(2));
            let unit = amazonUnit.replace(/\./g, '');
            if (unit.includes('fl oz')) unit = 'fl oz';
            else if (unit.includes('oz')) unit = 'oz';
            else if (unit.includes('lb')) unit = 'lb';
            else if (unit.includes('count') || unit.includes('ct')) unit = 'ct';
            unitInfo = { value: total, unit, totalValue: total, quantity: 1, formatted: `${total} ${unit}` } as any;
        } else {
            unitInfo = parseUnit(title);
        }

        const totalValue = unitInfo?.totalValue || 0;
        const unit = unitInfo?.unit || 'unknown';
        const score = totalValue > 0 ? (normalizeUnit(unitInfo as any).totalValue ? price / normalizeUnit(unitInfo as any).totalValue : price / totalValue) : price;

        products.push({
            id: asin, title, price, image, source: 'Amazon', rating, reviews,
            unit, amount: unitInfo?.value || 0, totalAmount: totalValue,
            pricePerUnit: calculatePricePerUnit(price, totalValue, unit),
            link, currency: 'USD', originalPrice: 0, score, unitInfo: unitInfo || undefined
        });
    });
    return products;
}