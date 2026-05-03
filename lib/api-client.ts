import { Product } from './types';
import { parseUnit, calculatePricePerUnit, toCanonicalUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

// --- CONSTANTS ---
const EXACT_MATCH_QUERIES = new Set(['toilet paper', 'paper towel', 'paper towels']);
const RATING_REGEX = /(\d+\.?\d*)\s*(?:out of 5|stars)/i;
const REVIEWS_REGEX = /(\d+[,.\d]*)/;

/**
 * MAIN SEARCH ENGINE
 * Optimized for Vercel Hobby (10s limit). 
 * Scrapes 7 pages but force-aborts at 7s to ensure the function can finish.
 */
export async function searchProducts(query: string, targetUnit?: string): Promise<Product[]> {
  try {
    const apiSearchTerm = EXACT_MATCH_QUERIES.has(query.toLowerCase()) ? `"${query}"` : query;
    const baseUrl = `https://www.amazon.com/s?k=${encodeURIComponent(apiSearchTerm)}`;

    // ACTIVE ABORT: Kill network requests at 7s to leave a 3s buffer for processing
    const SCRAPE_TIMEOUT = 7000; 

    const fetchPage = async (p: number): Promise<Product[]> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);

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
          }),
          signal: controller.signal // CRITICAL: Stop the network call at 7s
        });
        clearTimeout(timeoutId);
        const json = await res.json();
        const html = json.results?.[0]?.content || json.content || null;
        return html ? parseAmazonHTML(html) : [];
      } catch (err) { 
        clearTimeout(timeoutId);
        // Silently return empty on timeout/error so other pages can still succeed
        return []; 
      }
    };

    // Parallel breadth scrape (7 pages)
    const pageNumbers = [1, 2, 3, 4, 5, 6, 7];
    const pagePromises = pageNumbers.map(p => fetchPage(p));
    
    // Return whatever pages finished before the 7s cutoff
    const settleResults = await Promise.allSettled(pagePromises);
    
    let rawPool: Product[] = [];
    settleResults.forEach(res => { 
        if (res.status === 'fulfilled') rawPool = [...rawPool, ...res.value]; 
    });

    // Deduplicate by ASIN
    let masterPool = Array.from(new Map(rawPool.map(p => [p.id, p])).values());
    
    // PHASE 2: STRICT QUALITY FILTER (4.0+ Stars AND 100+ Reviews)
    const filtered = masterPool.filter(p => 
        p.price > 0 && 
        (p.rating ?? 0) >= 4.0 && 
        (p.reviews ?? 0) >= 100
    );

    // Final sort by best unit price score
    filtered.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));

    return filtered;
  } catch (error) { 
    console.error("Critical Search Error:", error);
    return []; 
  }
}

/**
 * PARSING LOGIC
 * Extracts data using resilient selectors to prevent rating/review data loss.
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

    // Attribute-based selectors for better resilience against class rotation
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