import { Product } from './types';
import { parseUnit, calculatePricePerUnit, normalizeUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

const EXACT_MATCH_QUERIES = new Set(['toilet paper', 'paper towel', 'paper towels']);
const ASIN_REGEX = /\/dp\/([A-Z0-9]{10})/;
const RATING_REGEX = /([0-9.]+) out of 5|([0-9.]+)\sstars/i;
const PPU_REGEX = /\(?\$([0-9.]+)\s*\/\s*([a-zA-Z\s.]+)\)?/i;

const searchCache = new Map<string, { data: Product[], timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; 

async function verifyUnitsWithAI(products: any[], signal?: AbortSignal) {
    if (products.length === 0 || !process.env.GEMINI_API_KEY) return [];
    const CHUNK_SIZE = 7; 
    const chunks = [];
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
        chunks.push(products.slice(i, i + CHUNK_SIZE));
    }
    const chunkPromises = chunks.map(async (chunk, index) => {
        const prompt = `Identify "Pack/Case" and "Total Weight" from titles. Return ONLY JSON array: [{"id": "string", "verifiedTotal": number, "unit": "oz|fl oz|ct|lb"}] \nProducts: ${chunk.map(p => `ID: ${p.id} | Title: ${p.title}`).join('\n')}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // Tighten to 20s
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                signal: signal || controller.signal 
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const jsonMatch = rawText?.match(/\[[\s\S]*\]/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch (error) {
            clearTimeout(timeoutId);
            return [];
        }
    });
    const results = await Promise.all(chunkPromises);
    return results.flat();
}

export async function searchProducts(query: string, page: number = 1): Promise<Product[]> {
    const START_TIME = Date.now();
    const VERCEL_CEILING_MS = 56000; // Hard cutoff before Vercel kills us at 60s
    const cacheKey = query.toLowerCase().trim().substring(0, 100);

    const cachedData = searchCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL_MS) return cachedData.data;

    try {
        const apiSearchTerm = EXACT_MATCH_QUERIES.has(cacheKey) ? `"${cacheKey}"` : cacheKey;
        const baseUrl = `https://www.amazon.com/s?k=${encodeURIComponent(apiSearchTerm)}`;
        
        const fetchPage = async (p: number): Promise<Product[]> => {
            try {
                const res = await fetch(`https://scraper-api.decodo.com/v2/scrape`, {
                    method: 'POST',
                    headers: { 'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: p === 1 ? baseUrl : `${baseUrl}&page=${p}`, proxy_pool: "premium", headless: "html" })
                });
                const json = await res.json();
                const html = json.results?.[0]?.content || json.content || null;
                return html ? parseAmazonHTML(html) : [];
            } catch (err) { return []; }
        };

        // SHIELD: Parallel Scrape with a TIGHTER timeout
        const pageNumbers = [1, 2, 3, 4, 5]; // Reduced to 5 pages for stability
        const SCRAPE_TIMEOUT_MS = 30000; 

        const pagePromises = pageNumbers.map(p => {
            const delay = (p - 1) * 150; 
            return new Promise<Product[]>(async (resolve) => {
                await new Promise(r => setTimeout(r, delay));
                const timeout = setTimeout(() => resolve([]), SCRAPE_TIMEOUT_MS);
                const products = await fetchPage(p);
                clearTimeout(timeout);
                resolve(products);
            });
        });

        const settleResults = await Promise.allSettled(pagePromises);
        let allProducts: Product[] = [];
        settleResults.forEach(res => { if (res.status === 'fulfilled') allProducts = [...allProducts, ...res.value]; });

        const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());
        let filteredResults = uniqueProducts.filter(p => (p.rating ?? 0) >= 3.8 && (p.reviews ?? 0) >= 50);
        filteredResults.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));

        const timeLeft = VERCEL_CEILING_MS - (Date.now() - START_TIME);

        // FORCE-THROUGH: Only AI verify if we have > 20s left
        if (filteredResults.length > 0 && timeLeft > 20000) {
            const highRisk = filteredResults.slice(0, 10); // Limit to top 10 for speed
            const corrections = await verifyUnitsWithAI(highRisk);
            const correctionMap = new Map(corrections.map((c: any) => [c.id, c]));
            
            filteredResults = filteredResults.map(p => {
                const correction = correctionMap.get(p.id);
                if (correction) {
                    p.totalAmount = correction.verifiedTotal;
                    p.unit = correction.unit;
                    p.aiVerified = true; 
                    p.pricePerUnit = calculatePricePerUnit(p.price, p.totalAmount ?? 0, p.unit ?? 'unknown');
                }
                return p;
            });
        }

        searchCache.set(cacheKey, { data: filteredResults, timestamp: Date.now() });
        return filteredResults;
    } catch (error) { return []; }
}

function parseAmazonHTML(html: string): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];
    $('div[data-component-type="s-search-result"]').each((i, element) => {
        const item = $(element);
        const asin = item.attr('data-asin') || `idx-${i}`; 
        const title = item.find('h2 a span, h2 span').first().text().trim();
        if (!title) return;
        const price = parseFloat(item.find('.a-price span.a-offscreen').first().text().replace(/[\$,]/g, '')) || 0;
        const rating = parseFloat(item.find('span[aria-label*="out of 5 stars"], i.a-icon-star span.a-icon-alt').first().text().match(RATING_REGEX)?.[1] || "0");
        const reviews = parseInt(item.find('span.a-size-base.s-underline-text').first().text().replace(/[,()]/g, ''), 10) || 0;
        const unitInfo = parseUnit(title);
        products.push({
            id: asin, title, price, source: 'Amazon', rating, reviews,
            image: item.find('img.s-image').attr('src') || '',
            unit: unitInfo?.unit || 'unknown',
            amount: unitInfo?.value || 0,
            totalAmount: unitInfo?.totalValue || 0,
            pricePerUnit: calculatePricePerUnit(price, unitInfo?.totalValue || 0, unitInfo?.unit || 'unknown'),
            link: getAmazonAffiliateLink(asin),
            currency: 'USD', originalPrice: 0,
            score: (unitInfo?.totalValue || 0) > 0 ? price / unitInfo!.totalValue : price
        });
    });
    return products;
}