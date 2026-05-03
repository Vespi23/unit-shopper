import { Product } from './types';
import { parseUnit, calculatePricePerUnit, toCanonicalUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { getAmazonAffiliateLink } from './affiliate';

const RATING_REGEX = /(\d+\.?\d*)\s*(?:out of 5|stars)/i;

export async function searchProducts(query: string): Promise<Product[]> {
  const GLOBAL_DEADLINE = 50000; // 50 seconds total for the whole operation

  try {
    const apiSearchTerm = query;
    const baseUrl = `https://www.amazon.com/s?k=${encodeURIComponent(apiSearchTerm)}`;

    const fetchPage = async (p: number, delay: number, signal: AbortSignal): Promise<Product[]> => {
      await new Promise(resolve => setTimeout(resolve, delay));
      if (signal.aborted) return [];

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
          signal // Responds to the 50s global stop
        });
        
        const json = await res.json();
        const html = json.results?.[0]?.content || json.content || null;
        return html ? parseAmazonHTML(html) : [];
      } catch (err) { return []; }
    };

    const globalController = new AbortController();
    const timeoutId = setTimeout(() => globalController.abort(), GLOBAL_DEADLINE);

    const pageNumbers = [1, 2, 3, 4, 5, 6, 7];
    const pagePromises = pageNumbers.map((p, index) => 
      fetchPage(p, index * 200, globalController.signal)
    );
    
    // Process results as they settle
    const settleResults = await Promise.allSettled(pagePromises);
    clearTimeout(timeoutId);
    
    let rawPool: Product[] = [];
    settleResults.forEach(res => { 
        if (res.status === 'fulfilled') rawPool = [...rawPool, ...res.value]; 
    });

    let masterPool = Array.from(new Map(rawPool.map(p => [p.id, p])).values());
    
    // QUALITY FILTER
    const filtered = masterPool.filter(p => 
        p.price > 0 && (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 100
    );

    filtered.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));
    return filtered;
  } catch (error) { 
    return []; 
  }
}

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

    if (price > 0) {
        products.push({
            id: asin, title, price, source: 'Amazon', rating, reviews: Math.floor(reviews),
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
    }
  });
  return products;
}