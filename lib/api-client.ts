import { Product } from './types';
import { parseUnit, calculatePricePerUnit, toCanonicalUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

// --- CONSTANTS ---
const EXACT_MATCH_QUERIES = new Set(['toilet paper', 'paper towel', 'paper towels']);
// IMPROVED REGEX: Captures decimal ratings and handles "k/m" in reviews
const RATING_REGEX = /(\d+\.?\d*)\s*(?:out of 5|stars)/i;
const REVIEWS_REGEX = /(\d+\.?\d*)\s*k?/; // Supports "1.2k" or "500"

/**
 * MAIN SEARCH ENGINE
 * Exhaustive Version: No internal timeouts. 
 * Runs until completion or infrastructure termination.
 */
export async function searchProducts(query: string, targetUnit?: string): Promise<Product[]> {
  try {
    const apiSearchTerm = EXACT_MATCH_QUERIES.has(query.toLowerCase()) ? `"${query}"` : query;
    const baseUrl = `https://www.amazon.com/s?k=${encodeURIComponent(apiSearchTerm)}`;

    /**
     * Internal Fetcher
     * Includes a delay to prevent slamming the Scraper API too hard (prevents 429s).
     */
    const fetchPage = async (p: number, delay: number): Promise<Product[]> => {
      await new Promise(resolve => setTimeout(resolve, delay));

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

        if (res.status === 429) {
          console.error(`[DECODO] Rate Limited on page ${p}`);
          return [];
        }

        const json = await res.json();
        const html = json.results?.[0]?.content || json.content || null;
        return html ? parseAmazonHTML(html) : [];
      } catch (err) { 
        console.error(`[SCRAPER] Page ${p} Fetch Error:`, err);
        return []; 
      }
    };

    // Parallel breadth scrape (7 pages) with a 250ms stagger
    const pageNumbers = [1, 2, 3, 4, 5, 6, 7];
    const pagePromises = pageNumbers.map((p, index) => fetchPage(p, index * 250));
    
    // Wait for all requests to finish naturally
    const settleResults = await Promise.allSettled(pagePromises);
    
    let rawPool: Product[] = [];
    settleResults.forEach(res => { 
        if (res.status === 'fulfilled') rawPool = [...rawPool, ...res.value]; 
    });

    // Deduplicate by ASIN to ensure clean results
    let masterPool = Array.from(new Map(rawPool.map(p => [p.id, p])).values());
    
    // FILTERING PHASE: Only runs after all results are retrieved
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
 * Extracts structured data using resilient, attribute-based selectors.
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

    // --- RESILIENT RATING EXTRACTION ---
    // Looks at icon alt text, aria-labels, and specific star classes
    const ratingRaw = item.find([
        'i[class*="a-star-"] span.a-icon-alt',
        '[aria-label*="out of 5 stars"]',
        '.a-icon-star-small .a-icon-alt',
        '.a-star-small-4-5',
        '.a-icon-star'
    ].join(',')).first().attr('aria-label') || item.find('i[class*="a-star-"]').text();
    
    const ratingMatch = ratingRaw.match(RATING_REGEX);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // --- RESILIENT REVIEW EXTRACTION ---
    // Handles "1,234", "1.2k+", and hidden underline text
    const reviewsText = item.find([
        'span.a-size-base.s-underline-text',
        '[aria-label*="ratings"]',
        '.a-size-small .a-size-base',
        'a.a-link-normal.s-underline-text'
    ].join(',')).first().text().toLowerCase().replace(/,/g, '');

    let reviews = 0;
    const reviewMatch = reviewsText.match(/(\d+\.?\d*)\s*([km])?/);
    if (reviewMatch) {
        reviews = parseFloat(reviewMatch[1]);
        if (reviewMatch[2] === 'k') reviews *= 1000;
        if (reviewMatch[2] === 'm') reviews *= 1000000;
    }

    const unitInfo = parseUnit(title);

    // Only push if we actually found a price (prevents empty "Sponsored" tiles)
    if (price > 0) {
        products.push({
            id: asin,
            title,
            price,
            source: 'Amazon',
            rating: rating || 0,
            reviews: Math.floor(reviews) || 0,
            image: item.find('img.s-image').attr('src') || '',
            unit: unitInfo?.unit || 'count', // Default to 'count' for sheets/sets
            amount: unitInfo?.value || 1,
            totalAmount: unitInfo?.totalValue || 1,
            unitInfo: unitInfo || undefined,
            pricePerUnit: calculatePricePerUnit(price, unitInfo?.totalValue || 1, unitInfo?.unit || 'count'),
            link: getAmazonAffiliateLink(asin),
            currency: 'USD',
            originalPrice: 0,
            score: (unitInfo?.totalValue || 0) > 0 ? price / unitInfo!.totalValue : price
        });
    }
  });
  
  return products;
}