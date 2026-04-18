import { Product } from './types';
import { parseUnit, calculatePricePerUnit, normalizeUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

// --- CONSTANTS ---
const EXACT_MATCH_QUERIES = new Set(['toilet paper', 'paper towel', 'paper towels']);
const RATING_REGEX = /(\d+\.?\d*)\s*(?:out of 5|stars)/i;
const REVIEWS_REGEX = /(\d+[,.\d]*)/;

const searchCache = new Map<string, { data: Product[], timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

// 1. IMPROVED AI PROMPT: Explicit Multi-Pack Instructions
async function verifyUnitsWithAI(products: any[], signal?: AbortSignal) {
  if (products.length === 0 || !process.env.GEMINI_API_KEY) return [];

  const CHUNK_SIZE = 7;
  const chunks = [];
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    chunks.push(products.slice(i, i + CHUNK_SIZE));
  }

  const chunkPromises = chunks.map(async (chunk) => {
    const prompt = `Task: Calculate the TOTAL quantity. 
      Example: "2 Packs of 12 Rolls" = 24. "Case of 4 (15oz cans)" = 60.
      Return ONLY a JSON array: [{"id": "string", "verifiedTotal": number, "unit": "oz|ct|lb|rolls|sheets"}]
      Products: ${chunk.map(p => `ID: ${p.id} | Title: ${p.title}`).join('\n')}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

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

// --- MAIN SEARCH ENGINE ---
export async function searchProducts(query: string, targetUnit?: string): Promise<Product[]> {
  const START_TIME = Date.now();
  const VERCEL_CEILING = 55000;
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
          headers: { 'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: p === 1 ? baseUrl : `${baseUrl}&page=${p}`, proxy_pool: "premium", headless: "html" })
        });
        const json = await res.json();
        const html = json.results?.[0]?.content || json.content || null;
        return html ? parseAmazonHTML(html) : [];
      } catch (err) { return []; }
    };

    // PHASE 1: Parallel Scrape
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

    // 1. Deduplicate
    let masterPool = Array.from(new Map(rawPool.map(p => [p.id, p])).values());

    // 2. PURIFICATION: Remove items with no price (unavailable)
    masterPool = masterPool.filter(p => p.price > 0);

    // PHASE 2: Tiered Filtering
    let filtered = masterPool.filter(p => (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 100);

    if (filtered.length < 10) {
      filtered = masterPool.filter(p => (p.rating ?? 0) >= 3.7 && (p.reviews ?? 0) >= 40);
    }

    if (filtered.length === 0) {
      filtered = masterPool;
    }

    // Pool-wide Sort
    filtered.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));

    // Winner's Circle
    let topPerformers = filtered.slice(0, 40);

    // PHASE 3: AI Re-Verification
    const timeLeft = VERCEL_CEILING - (Date.now() - START_TIME);
    if (topPerformers.length > 0 && timeLeft > 18000) {
      const toVerify = topPerformers.slice(0, 15);
      const corrections = await verifyUnitsWithAI(toVerify);
      const correctionMap = new Map(corrections.map((c: any) => [c.id, c]));

      topPerformers = topPerformers.map(p => {
        const correction = correctionMap.get(p.id);
        if (correction) {
          const newTotal = correction.verifiedTotal;
          const newUnit = correction.unit;

          p.totalAmount = newTotal;
          p.unit = newUnit;
          p.aiVerified = true;

          // SYNC: Sync unitInfo metadata
          p.unitInfo = {
            unit: newUnit,
            quantity: 1,
            value: newTotal,
            totalValue: newTotal,
            formatted: `${newTotal} ${newUnit}`
          };

          p.pricePerUnit = calculatePricePerUnit(p.price, newTotal, newUnit);
          p.score = p.price / (newTotal || 1);
        }
        return p;
      });

      topPerformers.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));
    }

    searchCache.set(cacheKey, { data: topPerformers, timestamp: Date.now() });
    return topPerformers;
  } catch (error) { return []; }
}

function parseAmazonHTML(html: string): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];

  $('div[data-component-type="s-search-result"]').each((i, element) => {
    const item = $(element);
    const asin = item.attr('data-asin');
    if (!asin || asin.length !== 10) return;

    const title = item.find('h2 a span, h2 span, span.a-text-normal').first().text().trim();
    const price = parseFloat(item.find('.a-price span.a-offscreen').first().text().replace(/[\$,]/g, '')) || 0;

    const ratingRaw = item.find('[aria-label*="out of 5 stars"], .a-icon-star-small .a-icon-alt').first().text();
    const rating = parseFloat(ratingRaw.match(RATING_REGEX)?.[1] || "0");

    const reviewsRaw = item.find('span.a-size-base.s-underline-text, .a-size-small .a-size-base').first().text();
    const reviews = parseInt(reviewsRaw.replace(/[,()]/g, '').match(REVIEWS_REGEX)?.[1] || "0", 10) || 0;

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