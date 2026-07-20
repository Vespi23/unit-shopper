import { Product } from './types';
import { parseUnit, calculatePricePerUnit, normalizeUnit, toCanonicalUnit } from './unit-parser';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';

const RATING_REGEX = /(\d+\.?\d*)\s*(?:out of 5|stars)/i;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
];

export async function scrapePage(url: string, source: 'amazon' | 'walmart'): Promise<Product[]> {
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
        render_js: true,
        session_id: randomUUID(), 
        user_agent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
      })
    });

    if (!res.ok) return [];

    const json = await res.json();
    const html = json.results?.[0]?.content || json.content || "";
    
    return source === 'amazon' ? parseAmazon(html) : parseWalmart(html);
  } catch (err) { 
    return []; 
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  const pages = [1, 2, 3, 4, 5, 6, 7];
  const allResults: Product[] = [];
  const BATCH_SIZE = 2; 

  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(p => Promise.all([
      scrapePage(`https://www.amazon.com/s?k=${encodeURIComponent(query)}&page=${p}`, 'amazon'),
      scrapePage(`https://www.walmart.com/search?q=${encodeURIComponent(query)}&page=${p}`, 'walmart')
    ]));

    const results = await Promise.allSettled(batchPromises);
    results.forEach(res => {
        if (res.status === 'fulfilled') {
            allResults.push(...res.value[0], ...res.value[1]);
        }
    });
    
    await new Promise(r => setTimeout(r, 800));
  }

  const masterPool = Array.from(new Map(allResults.map(p => [p.id, p])).values());

  return masterPool
    .filter((p: Product) => p.price > 0 && (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 100)
    .map((p: Product) => {
        const unitInfo = parseUnit(p.title);
        const norm = unitInfo ? normalizeUnit(unitInfo) : { unit: 'count', totalValue: 1 };
        const ppu = parseFloat(String(calculatePricePerUnit(p.price, norm.totalValue, toCanonicalUnit(norm.unit)))) || p.price;
        return { 
            ...p, 
            score: ppu
        } as Product;
    })
    .sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));
}

function parseAmazon(html: string): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];
  
  $('div[data-component-type="s-search-result"]').each((_, el) => {
    const item = $(el);
    const asin = item.attr('data-asin');
    const title = item.find('h2 span').first().text().trim();
    const priceText = item.find('.a-price-whole').text().replace(/[^0-9.]/g, '');
    const price = parseFloat(priceText) || 0;
    const ratingRaw = item.find('.a-icon-star-small .a-icon-alt').text();
    const rating = parseFloat(ratingRaw.match(RATING_REGEX)?.[1] || "0");
    const reviews = parseInt(item.find('span.a-size-base').text().replace(/,/g, ''), 10) || 0;
    
    if (asin && price > 0) {
        products.push({ 
            id: `amzn-${asin}`, 
            title, 
            price, 
            rating, 
            reviews, 
            source: 'amazon',
            url: `https://www.amazon.com/dp/${asin}`,
            link: `https://www.amazon.com/dp/${asin}`,
            image: item.find('img.s-image').attr('src') || '',
            unit: 'count',
            amount: 1,
            totalAmount: 1,
            pricePerUnit: `$${price.toFixed(2)}/ea`,
            currency: 'USD',
            originalPrice: price,
            score: price
        } as Product);
    }
  });
  return products;
}

function parseWalmart(html: string): Product[] {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return [];
  
  try {
    const json = JSON.parse(match[1]);
    const items = json.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || [];
    
    return items.map((i: any): Product => ({
        id: `wmt-${i.usItemId}`,
        title: i.name,
        price: i.priceInfo?.currentPrice?.price || 0,
        source: 'walmart',
        rating: i.rating?.averageRating || 0,
        reviews: i.rating?.reviewCount || 0,
        url: `https://www.walmart.com${i.canonicalUrl}`,
        link: `https://www.walmart.com${i.canonicalUrl}`,
        image: i.imageInfo?.thumbnailUrl || '',
        unit: 'count',
        amount: 1,
        totalAmount: 1,
        pricePerUnit: `$${(i.priceInfo?.currentPrice?.price || 0).toFixed(2)}/ea`,
        currency: 'USD',
        originalPrice: i.priceInfo?.currentPrice?.price || 0,
        score: i.priceInfo?.currentPrice?.price || 0
    }) as Product).filter((p: Product) => p.price > 0);
  } catch { return []; }
}