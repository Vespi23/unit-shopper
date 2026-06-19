// =========================================================================
// RUNTIME SERVER CHUNK RECOVERY INNER SHIELD (LINE 1 DEPLOYMENT)
// =========================================================================
if (typeof process !== 'undefined' && process.env) {
  process.env.UPSTASH_DISABLE_TELEMETRY = "1";
  
  if (!process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL.startsWith("/")) {
    process.env.UPSTASH_REDIS_REST_URL = "https://disabled-telemetry.localhost";
  }
  if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
    process.env.UPSTASH_REDIS_REST_TOKEN = "mock_runtime_token_bypass";
  }
}
// =========================================================================

import { Product } from './types';
import { parseUnit, calculatePricePerUnit, toCanonicalUnit } from './unit-parser';
import * as cheerio from 'cheerio';

const RATING_REGEX = /(\d+\.?\d*)\s*(?:out of 5|stars)/i;

export async function searchProducts(query: string): Promise<Product[]> {
  const GLOBAL_DEADLINE = 55000; 

  try {
    const apiSearchTerm = query;
    const baseUrl = `https://www.amazon.com/s?k=${encodeURIComponent(apiSearchTerm)}`;

    const fetchPage = async (p: number, delay: number, signal: AbortSignal): Promise<Product[]> => {
      await new Promise(resolve => setTimeout(resolve, delay));
      if (signal.aborted) return [];

      try {
        const token = process.env.DECODO_AUTH_TOKEN || "";
        const authHeader = token.startsWith("Basic ") || token.startsWith("Bearer ") 
          ? token 
          : `Bearer ${token}`;

        const res = await fetch(`https://scraper-api.decodo.com/v2/scrape`, {
          method: 'POST',
          headers: { 
            'Authorization': authHeader, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            url: p === 1 ? baseUrl : `${baseUrl}&page=${p}`, 
            proxy_pool: "premium", 
            headless: "html" 
          }),
          signal 
        });
        
        if (!res.ok) return [];

        const json = await res.json();
        const html = json.results?.[0]?.content || json.content || null;
        return html ? parseAmazonHTML(html) : [];
      } catch (err) { 
        return []; 
      }
    };

    const globalController = new AbortController();
    const timeoutId = setTimeout(() => globalController.abort(), GLOBAL_DEADLINE);

    const pageNumbers = [1, 2, 3];
    const pagePromises = pageNumbers.map((p, index) => 
      fetchPage(p, index * 400, globalController.signal)
    );
    
    const settleResults = await Promise.allSettled(pagePromises);
    clearTimeout(timeoutId);
    
    let rawPool: Product[] = [];
    settleResults.forEach(res => { 
        if (res.status === 'fulfilled') rawPool = [...rawPool, ...res.value]; 
    });

    let masterPool = Array.from(new Map(rawPool.map(p => [p.id, p])).values());
    
    const filtered = masterPool.filter(p => 
        p.price > 0 && (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 100
    );

    filtered.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));
    return filtered;
  } catch (error) { 
    console.error(`[API_CLIENT_CRITICAL_EXCEPTION]: ${error}`);
    return []; 
  }
}

function parseAmazonHTML(html: string): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];

  let affiliateExtractor: any = null;
  try {
    affiliateExtractor = require('./affiliate');
  } catch (_) {}

  $('div[data-component-type="s-search-result"]').each((i, element) => {
    const item = $(element);
    const asin = item.attr('data-asin');
    if (!asin || asin.length !== 10) return;

    const title = item.find('h2 a span, h2 span, span.a-text-normal').first().text().trim();
    const priceText = item.find('.a-price span.a-offscreen').first().text().replace(/[^0-9.]/g, '');
    const price = parseFloat(priceText) || 0;

    const ratingRaw = item.find('i[class*="a-star-"], [aria-label*="out of 5 stars"], .a-icon-star-small .a-icon-alt').first().text();
    const rating = parseFloat(ratingRaw.match(RATING_REGEX)?.[1] || "0");

    const reviewsText = item.find('span.a-size-base.s-underline-text, [aria-label*="ratings"], .a-size-small .a-size-base').first().text().toLowerCase().replace(/,/g, '');
    let reviews = 0;
    const reviewMatch = reviewsText.match(/(\d+\.?\d*)\s*([km])?/);
    if (reviewMatch) {
        reviews = parseFloat(reviewMatch[1]);
        if (reviewMatch[2] === 'k') reviews *= 1000;
        if (reviewMatch[2] === 'm') reviews *= 1000000;
    }

    const unitInfo = parseUnit(title);

    let redirectLink = `https://www.amazon.com/dp/${asin}`;
    if (affiliateExtractor && typeof affiliateExtractor.getAmazonAffiliateLink === 'function') {
      try {
        redirectLink = affiliateExtractor.getAmazonAffiliateLink(asin);
      } catch (_) {}
    }

    if (price > 0) {
        products.push({
            id: asin, title, price, source: 'Amazon', rating, reviews: Math.floor(reviews),
            image: item.find('img.s-image').attr('src') || '',
            unit: unitInfo?.unit || 'unknown',
            amount: unitInfo?.value || 0,
            totalAmount: unitInfo?.totalValue || 0,
            unitInfo: unitInfo || undefined,
            pricePerUnit: calculatePricePerUnit(price, unitInfo?.totalValue || 0, unitInfo?.unit || 'unknown'),
            link: redirectLink,
            currency: 'USD', originalPrice: 0,
            score: (unitInfo?.totalValue || 0) > 0 ? price / unitInfo!.totalValue : price
        });
    }
  });
  return products;
}