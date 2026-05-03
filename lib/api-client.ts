import { Product } from './types';
import { parseUnit, calculatePricePerUnit, toCanonicalUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

// --- CONSTANTS ---
const EXACT_MATCH_QUERIES = new Set(['toilet paper', 'paper towel', 'paper towels']);
const RATING_REGEX = /(\d+\.?\d*)\s*(?:out of 5|stars)/i;
const REVIEWS_REGEX = /(\d+[,.\d]*)/;

const searchCache = new Map<string, { data: Product[], timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

/**
 * PHASE 3: AI Verification
 * Uses Gemini 1.5 Flash to verify complex unit logic for the top candidates.
 * Limited to a small batch to stay within Vercel's 60s execution limit.
 */
async function verifyUnitsWithAI(products: any[], signal?: AbortSignal) {
  if (products.length === 0 || !process.env.GEMINI_API_KEY) return [];

  const CHUNK_SIZE = 7;
  const chunks = [];
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    chunks.push(products.slice(i, i + CHUNK_SIZE));
  }

  const chunkPromises = chunks.map(async (chunk) => {
    const prompt = `Task: Calculate the TOTAL quantity for unit price comparison. 
      Rules:
      1. Multiply packs (e.g., "Pack of 4 (12oz)" = 48).
      2. Return ONLY a JSON array: [{"id": "string", "verifiedTotal": number, "unit": "oz|count|lb|rolls|sheets|fl oz|gal"}]
      3. Use 'count' for each/ct/pcs.
      4. Use canonical units only.
      Products: ${chunk.map(p => `ID: ${p.id} | Title: ${p.title}`).join('\n')}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
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

/**
 * MAIN SEARCH ENGINE
 * Orchestrates multi-page scraping via Decodo and applies strict filtering logic.
 */
export async function searchProducts(query: string, targetUnit?: string): Promise<Product[]> {
  const START_TIME = Date.now();
  const VERCEL_CEILING = 55000; // 55s safety cutoff for Vercel functions
  const cacheKey = `${query.toLowerCase().trim()}_${targetUnit || 'none'}`.substring(0, 100);

  const cachedData = searchCache.get(cacheKey);
  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL_MS) return cachedData.data;

  try {
    const apiSearchTerm = EXACT_MATCH_QUERIES.has(query.toLowerCase()) ? `"${query}"` : query;
    const baseUrl = `https://www.amazon.com/s?k=${encodeURIComponent(apiSearchTerm)}`;

    const fetchPage = async (p: number): Promise<Product[]> => {
      try {
        const res = await fetch(`https://scraper-api.decodo.com/v2/scrape`, {
          method: 'POST',
          headers: { 
            'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            url: p === 1 ? baseUrl : `${baseUrl}&page=${p}`, 
            proxy_pool: "premium", 
            headless: "html" 
          })
        });
        const json = await res.json();
        const html = json.results?.[0]?.content || json.content || null;
        return html ? parseAmazonHTML(html) : [];
      } catch (err) { return []; }
    };

    // Scrape 7 pages for breadth
    const pageNumbers = [1, 2, 3, 4, 5, 6, 7];
    const SCRAPE_TIMEOUT = 35000;

    const pagePromises = pageNumbers.map(p => {
      const delay = (p - 1) * 100;
      return new Promise<Product[]>(async (resolve) => {
        await new Promise(r => setTimeout(r, delay));
        const timeout = setTimeout(() => resolve([]), SCRAPE_TIMEOUT);
        const results = await fetchPage(p);
        clearTimeout(timeout);
        resolve(results);
      });
    });

    const settleResults = await Promise.allSettled(pagePromises);
    let rawPool: Product[] = [];
    settleResults.forEach(res => { if (res.status === 'fulfilled') rawPool = [...rawPool, ...res.value]; });

    // Deduplicate items
    let masterPool = Array.from(new Map(rawPool.map(p => [p.id, p])).values());
    masterPool = masterPool.filter(p => p.price > 0);

    // PHASE 2: STRICT FILTERING (4.0+ Stars AND 100+ Reviews)
    const filtered = masterPool.filter(p => 
        (p.rating ?? 0) >= 4.0 && 
        (p.reviews ?? 0) >= 100
    );

    // Sort by unit price score (price / total quantity)
    filtered.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));
    
    // Result Cap Removed: All qualified products are returned to the user
    let topPerformers = filtered; 

    // PHASE 3: AI RE-VERIFICATION (Restricted to top 15 for sub-60s performance)
    const VERCEL_SAFE_BUFFER = 15000; 
    const timeLeft = VERCEL_CEILING - (Date.now() - START_TIME);

    if (topPerformers.length > 0 && timeLeft > VERCEL_SAFE_BUFFER) {
      const toVerify = topPerformers.slice(0, 15);
      const corrections = await verifyUnitsWithAI(toVerify);
      const correctionMap = new Map(corrections.map((c: any) => [c.id, c]));

      topPerformers = topPerformers.map(p => {
        const correction = correctionMap.get(p.id);
        if (correction) {
          const canonicalUnit = toCanonicalUnit(correction.unit);
          const newTotal = correction.verifiedTotal;

          p.totalAmount = newTotal;
          p.unit = canonicalUnit;
          p.aiVerified = true;
          p.unitInfo = {
            unit: canonicalUnit,
            quantity: 1,
            value: newTotal,
            totalValue: newTotal,
            formatted: `${newTotal} ${canonicalUnit}`
          };

          p.pricePerUnit = calculatePricePerUnit(p.price, newTotal, canonicalUnit);
          p.score = p.price / (newTotal || 1);
        }
        return p;
      });

      // Re-sort after potential AI corrections
      topPerformers.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));
    }

    searchCache.set(cacheKey, { data: topPerformers, timestamp: Date.now() });
    return topPerformers;
  } catch (error) { 
    console.error("Critical Search Error:", error);
    return []; 
  }
}

/**
 * PARSING LOGIC
 * Extracts structured data from raw Amazon HTML.
 * Uses resilient selectors to prevent rating/review data loss.
 */
function parseAmazonHTML(html: string): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];

  $('div[data-component-type="s-search-result"]').each((i, element) => {
    const item = $(element);
    const asin = item.attr('data-asin');
    if (!asin || asin.length !== 10) return;

    const title = item.find('h2 a span, h2 span, span.a-text-normal').first().text().trim();
    const priceText = item.find('.a-price span.a-offscreen').first().text().replace(/[^0-9.]/g, '');
    const price = parseFloat(priceText) || 0;

    // Resilient Selectors for Rating and Reviews
    const ratingRaw = item.find('i[class*="a-star-"], [aria-label*="out of 5 stars"], .a-icon-star-small .a-icon-alt').first().text();
    const rating = parseFloat(ratingRaw.match(RATING_REGEX)?.[1] || "0");

    const reviewsRaw = item.find('span.a-size-base.s-underline-text, [aria-label*="reviews"], .a-size-small .a-size-base').first().text();
    const reviews = parseInt(reviewsRaw.replace(/[^0-9]/g, '').match(REVIEWS_REGEX)?.[1] || "0", 10) || 0;

    const unitInfo = parseUnit(title);

    products.push({
      id: asin, title, price, source: 'Amazon', rating, reviews,
      image: item.find('img.s-image').attr('src') || '',
      unit: unitInfo?.unit || 'unknown',
      amount: unitInfo?.value || 0,
      totalAmount: unitInfo?.totalValue || 0,
      unitInfo: unitInfo || undefined,
      pricePerUnit: calculatePricePerUnit(price, unitInfo?.totalValue || 0, unitInfo?.unit || 'unknown'),
      link: getAmazonAffiliateLink(asin),
      currency: 'USD', originalPrice: 0,
      score: (unitInfo?.totalValue || 0) > 0 ? price / unitInfo!.totalValue : price
    });
  });
  return products;
}