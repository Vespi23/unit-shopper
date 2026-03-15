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

// --- AI TIE-BREAKER HELPER ---
async function verifyUnitsWithAI(products: any[]) {
    if (products.length === 0) return [];
    if (!process.env.GEMINI_API_KEY) return [];

    // CHUNKING LOGIC: Process 25 products at a time to avoid Vercel timeouts
    const CHUNK_SIZE = 25;
    const allCorrections: any[] = [];

    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
        const chunk = products.slice(i, i + CHUNK_SIZE);
        console.log(`[AI CHUNK] Processing items ${i + 1} to ${Math.min(i + CHUNK_SIZE, products.length)}...`);

        const prompt = `Return ONLY a JSON array: [{"id": "string", "verifiedTotal": number, "unit": "oz|fl oz|ct|lb"}] for these products:
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
            
            if (rawText) {
                const jsonMatch = rawText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    allCorrections.push(...parsed);
                }
            }
        } catch (error) {
            console.error("Chunk processing failed:", error);
            // Continue to next chunk instead of failing entirely
        }
    }

    console.log(`✅ Total AI corrections received: ${allCorrections.length}`);
    return allCorrections;
}

// --- MAIN SEARCH FUNCTION ---
export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {
    const MAX_QUERY_LENGTH = 100;
    if (query.length > MAX_QUERY_LENGTH) {
        query = query.substring(0, MAX_QUERY_LENGTH);
    }

    const cacheKey = `${query.toLowerCase().trim()}-multi-v15-ai-force`;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
        return cached.data;
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
        let firstPageHtml = await fetchPage(1, baseUrl);
        let firstPageProducts = firstPageHtml ? parseAmazonHTML(firstPageHtml) : [];

        // Fallback if empty
        if (firstPageProducts.length === 0 && !isExactMatch) {
            apiSearchTerm = `"${query}"`;
            baseUrl = getBaseUrl(apiSearchTerm);
            firstPageHtml = await fetchPage(1, baseUrl);
            firstPageProducts = firstPageHtml ? parseAmazonHTML(firstPageHtml) : [];
        }

        let allProducts: Product[] = [...firstPageProducts];

        // Fetch Pages 2-3 concurrently
        if (allProducts.length > 0) {
            const htmlResults = await Promise.all([fetchPage(2, baseUrl), fetchPage(3, baseUrl)]);
            htmlResults.forEach(html => {
                if (html) allProducts = [...allProducts, ...parseAmazonHTML(html)];
            });
        }

        // Ensure unique results
        const uniqueProductsMap = new Map<string, Product>();
        allProducts.forEach(product => {
            if (!uniqueProductsMap.has(product.id)) uniqueProductsMap.set(product.id, product);
        });
        let uniqueProducts = Array.from(uniqueProductsMap.values());

        // --- AI TIE-BREAKER INTEGRATION ---
const highRisk = uniqueProducts;
        if (highRisk.length > 0) {
            console.log(`[AI TIE-BREAKER] Verifying ${highRisk.length} products...`);
            const corrections = await verifyUnitsWithAI(highRisk);
            
            uniqueProducts = uniqueProducts.map(p => {
                const correction = corrections.find((c: any) => c.id === p.id);
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
                    p.aiVerified = true; // <-- This tells the UI to show the sparkle badge
                }
                return p;
            });
        }

        const filteredResults = uniqueProducts.filter(p => (p.rating ?? 0) >= 4 && p.price > 0);
        filteredResults.sort((a, b) => (a.score ?? 999999) - (b.score ?? 999999));

        if (filteredResults.length > 0) {
            searchCache.set(cacheKey, { timestamp: Date.now(), data: filteredResults });
        }
        return filteredResults;

    } catch (error) {
        console.error('Search Error:', error);
        return cached?.data || [];
    }
}

// --- HTML PARSER ---
function parseAmazonHTML(html: string): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];

    // CHANGED: Added 'i' as the first parameter
    $('div[data-component-type="s-search-result"]').each((i, element) => {
        const item = $(element);
        
        // STABLE ID LOGIC: 1. data-asin, 2. URL extraction, 3. Stable Index
        const asin = item.attr('data-asin') || 
                     item.find('h2 a').attr('href')?.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || 
                     `idx-${i}`; 

        let title = item.find('h2 a span, h2 span, span.a-text-normal').first().text().trim();
        if (!title) return;

        let price = 0;
        const priceText = item.find('.a-price span.a-offscreen').first().text().replace(/[\$,]/g, '').trim();
        if (priceText) price = parseFloat(priceText);

        const image = item.find('img.s-image').attr('src') || '';
        const ratingText = item.find('i[data-cy="reviews-ratings-slot"] span.a-icon-alt, span[aria-label*="out of 5 stars"]').first().text();
        const ratingMatch = ratingText.match(/([0-9.]+) out of 5/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

        const reviewsText = item.find('span.a-size-base.s-underline-text').first().text().replace(/[,()]/g, '');
        const reviews = parseInt(reviewsText, 10) || 0;

        const link = getAmazonAffiliateLink(asin);

        // Scrape Amazon's built-in PPU
        let amazonPpu = 0;
        let amazonUnit = '';
        item.find('.a-size-base.a-color-secondary, .a-color-price').each((_, el) => {
            const match = $(el).text().trim().match(/\(?\$([0-9.]+)\s*\/\s*([a-zA-Z\s.]+)\)?/i);
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