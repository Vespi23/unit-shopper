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
import { parseUnit, calculatePricePerUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';

const RATING_REGEX = /(\d+\.?\d*)\s*(?:out of 5|stars)/i;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
];

async function scrapePage(url: string, retailer: 'Amazon' | 'Walmart'): Promise<Product[]> {
  const token = process.env.DECODO_AUTH_TOKEN || "";
  const authHeader = token.startsWith("Basic ") || token.startsWith("Bearer ") ? token : `Bearer ${token}`;

  try {
    const res = await fetch(`https://scraper-api.decodo.com/v2/scrape`, {
      method: 'POST',
      headers: { 
        'Authorization': authHeader, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        url, 
        proxy_pool: "premium", 
        render_js: true, // Mandatory for bypassing bot challenges
        session_id: randomUUID(), // Prevent session tracking
        user_agent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
      })
    });

    if (!res.ok) return [];

    const json = await res.json();
    const html = json.results?.[0]?.content || json.content || "";
    
    return retailer === 'Amazon' ? parseAmazonHTML(html) : parseWalmartHTML(html);
  } catch (err) { 
    return []; 
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  const pages = [1, 2, 3, 4, 5, 6, 7];
  const allResults: Product[] = [];
  const BATCH_SIZE = 2; // Keep concurrent requests low to avoid 403 blocks

  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(p => Promise.all([
      scrapePage(`https://www.amazon.com/s?k=${encodeURIComponent(query)}&page=${p}`, 'Amazon'),
      scrapePage(`https://www.walmart.com/search?q=${encodeURIComponent(query)}&page=${p}`, 'Walmart')
    ]));

    const results = await Promise.allSettled(batchPromises);
    results.forEach(res => {
        if (res.status === 'fulfilled') {
            allResults.push(...res.value[0], ...res.value[1]);
        }
    });
    
    // Controlled sleep to prevent rate limiting (Decodo limit 10req/s)
    await new Promise(r => setTimeout(r, 600));
  }

  // Final In-Memory Deduplication & Sorting
  const masterPool = Array.from(new Map(allResults.map(p => [p.id, p])).values());
  return masterPool
    .filter(p => p.price > 0 && (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 100)
    .sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));
}

function parseAmazonHTML(html: string): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];
  
  $('div[data-component-type="s-search-result"]').each((i, element) => {
    const item = $(element);
    const asin = item.attr('data-asin');
    if (!asin) return;

    const title = item.find('h2 a span, h2 span, span.a-text-normal').first().text().trim();
    const priceText = item.find('.a-price span.a-offscreen').first().text().replace(/[^0-9.]/g, '');
    const price = parseFloat(priceText) || 0;

    if (price > 0) {
        const unitInfo = parseUnit(title);
        products.push({
            id: asin, title, price, source: 'Amazon',
            rating: parseFloat(item.find('.a-icon-star-small .a-icon-alt').first().text().match(RATING_REGEX)?.[1] || "0"),
            reviews: 0,
            image: item.find('img.s-image').attr('src') || '',
            unit: unitInfo?.unit || 'unknown',
            amount: unitInfo?.value || 0,
            totalAmount: unitInfo?.totalValue || 0,
            unitInfo: unitInfo || undefined,
            pricePerUnit: calculatePricePerUnit(price, unitInfo?.totalValue || 0, unitInfo?.unit || 'unknown'),
            link: `https://www.amazon.com/dp/${asin}`,
            currency: 'USD', originalPrice: 0,
            score: (unitInfo?.totalValue || 0) > 0 ? price / unitInfo!.totalValue : price
        });
    }
  });
  return products;
}

function parseWalmartHTML(html: string): Product[] {
  const $ = cheerio.load(html);
  const nextData = $('script#__NEXT_DATA__').text();
  if (!nextData) return [];
  
  try {
    const json = JSON.parse(nextData);
    const items = json.props.pageProps.initialData.searchResult.itemStacks[0].items;
    
    return items.map((item: any) => {
        const price = item.priceInfo?.currentPrice?.price || 0;
        const unitInfo = parseUnit(item.name || '');
        return {
            id: item.usItemId,
            title: item.name || '',
            price,
            source: 'Walmart',
            rating: item.rating?.averageRating || 0,
            reviews: item.rating?.reviewCount || 0,
            image: item.imageInfo?.thumbnailUrl || '',
            unit: unitInfo?.unit || 'unknown',
            amount: unitInfo?.value || 0,
            totalAmount: unitInfo?.totalValue || 0,
            unitInfo: unitInfo || undefined,
            pricePerUnit: calculatePricePerUnit(price, unitInfo?.totalValue || 0, unitInfo?.unit || 'unknown'),
            link: `https://www.walmart.com${item.canonicalUrl}`,
            currency: 'USD',
            originalPrice: 0,
            score: (unitInfo?.totalValue || 0) > 0 ? price / unitInfo!.totalValue : price
        };
    }).filter((p: Product) => p.price > 0);
  } catch (e) { return []; }
}