import * as cheerio from 'cheerio';

// ==========================================
// 1. TYPE DEFINITIONS
// ==========================================

export interface Product {
    id: string;
    title: string;
    name?: string;
    price: number;
    source: 'amazon' | 'walmart';
    averageRating?: number;
    numberOfReviews?: number;
    url: string;
    link?: string;
    image: string;
    thumbnail?: string;
    unit?: string;
    amount?: number;
    totalAmount?: number;
    pricePerUnit?: string;
    currency?: string;
    originalPrice?: number;
    score?: number;
}

// ==========================================
// 2. UNIT MATH & PPU UTILITIES
// ==========================================

function parseUnit(title: string) {
    const match = title.match(/(\d+(?:\.\d+)?)\s*(oz|fl\s*oz|lbs?|count|ct|pack|pk)/i);
    if (!match) return null;
    return { value: parseFloat(match[1]), unit: match[2].toLowerCase() };
}

function normalizeUnit(unitInfo: { value: number, unit: string }) {
    let normalizedUnit = unitInfo.unit;
    if (['oz', 'fl oz', 'fluid ounce'].includes(unitInfo.unit)) normalizedUnit = 'oz';
    if (['lb', 'lbs', 'pound'].includes(unitInfo.unit)) {
        normalizedUnit = 'oz';
        unitInfo.value *= 16;
    }
    if (['count', 'ct', 'pack', 'pk'].includes(unitInfo.unit)) normalizedUnit = 'count';
    
    return { unit: normalizedUnit, totalValue: unitInfo.value || 1 };
}

function toCanonicalUnit(unit: string): string {
    return unit === 'oz' ? 'oz' : 'count';
}

function calculatePricePerUnit(price: number, totalValue: number, unit: string): string | number {
    if (!totalValue || totalValue <= 0) return price;
    const ppu = price / totalValue;
    return parseFloat(ppu.toFixed(2));
}

// ==========================================
// 3. AMAZON SCRAPER (EXISTING LOGIC)
// ==========================================

/**
 * 🌐 Scrapes a single page of Amazon search results.
 * Adjust selectors based on your specific Amazon ingestion logic.
 */
async function scrapeAmazonPage(url: string): Promise<Product[]> {
    // If you use a proxy for Amazon, insert it here. Otherwise, standard fetch.
    // NOTE: Replace with your actual working Amazon scraper logic if different.
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });
        if (!res.ok) return [];
        const html = await res.text();
        const $ = cheerio.load(html);
        const products: Product[] = [];

        $('div[data-component-type="s-search-result"]').each((_, el) => {
            const title = $(el).find('h2 span').text().trim();
            const priceText = $(el).find('.a-price .a-offscreen').first().text().replace('$', '').trim();
            const price = parseFloat(priceText);
            const image = $(el).find('img.s-image').attr('src') || '';
            const link = $(el).find('h2 a').attr('href') || '';
            const asin = $(el).attr('data-asin') || Math.random().toString(36).substring(7);

            if (title && price && !isNaN(price)) {
                products.push({
                    id: `amz-${asin}`,
                    title,
                    price,
                    source: 'amazon',
                    url: `https://www.amazon.com${link}`,
                    image
                });
            }
        });
        return products;
    } catch (e) {
        console.error('[AMAZON_SCRAPE_ERROR]', e);
        return [];
    }
}

// ==========================================
// 4. WALMART PARSER & DECODO CLIENT
// ==========================================

/**
 * 🧩 Parses Walmart HTML to extract product data from the __NEXT_DATA__ JSON state.
 */
export function parseWalmart(html: string): Product[] {
    try {
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
        if (!match) return [];
        
        const json = JSON.parse(match[1]);
        const items = json.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || [];
        
        return items.map((i: any): Product | null => {
            const price = i.priceInfo?.currentPrice?.price || i.price || 0;
            if (!price) return null;

            return {
                id: `wmt-${i.usItemId}`,
                title: i.name || i.title || 'Unknown Product',
                name: i.name || i.title || 'Unknown Product',
                price: price,
                source: 'walmart',
                averageRating: i.rating?.averageRating || 4.5,
                numberOfReviews: i.rating?.numberOfReviews || 0,
                url: i.canonicalUrl ? (i.canonicalUrl.startsWith('http') ? i.canonicalUrl : `https://www.walmart.com${i.canonicalUrl}`) : '',
                image: i.imageInfo?.thumbnailUrl || i.image || '',
                unit: 'count',
                amount: 1,
                totalAmount: 1,
                pricePerUnit: `$${price.toFixed(2)}/ea`,
                currency: 'USD',
                originalPrice: price,
                score: price
            };
        }).filter((p: Product | null): p is Product => p !== null); // <-- Added explicit type here
    } catch (e) {
        console.error('[PARSE_WALMART_ERROR]', e);
        return [];
    }
}

/**
 * 🌐 Scrapes Walmart via Decodo Native REST API using the dedicated 'walmart_search' template.
 */
async function scrapeWalmart(query: string, timeoutMs: number = 45000): Promise<Product[]> {
    if (!process.env.DECODO_AUTH_TOKEN) {
        console.warn('[WALMART_NATIVE] Missing DECODO_AUTH_TOKEN.');
        return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        console.log(`[WALMART_NATIVE] Dispatching 'walmart_search' template for: ${query}`);
        
        const res = await fetch(`https://scraper-api.decodo.com/v2/scrape`, {
            method: 'POST',
            headers: { 
                'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                target: 'walmart_search',
                query: query,
                headless: 'html',
                parse: true
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[WALMART_NATIVE_FAIL] Status: ${res.status} | Details: ${errText}`);
            return [];
        }

        const data = (await res.json()) as Record<string, any>;
        
        // Unwrap Decodo's JSON response to isolate the HTML payload
        let htmlContent = '';
        if (data.results && Array.isArray(data.results) && data.results.length > 0 && data.results[0].content) {
            htmlContent = data.results[0].content;
        } else if (data.content) {
            htmlContent = data.content;
        } else {
            htmlContent = JSON.stringify(data);
        }

        if (htmlContent.includes('px-captcha') || htmlContent.includes('Access Denied')) {
            console.warn('[WALMART_NATIVE_DEFENSE] PerimeterX wall detected despite search template.');
            return [];
        }

        const products = parseWalmart(htmlContent);
        console.log(`[WALMART_NATIVE] Success: ${products.length} items extracted.`);
        return products;

    } catch (error) {
        clearTimeout(timeout);
        console.error(`[WALMART_NATIVE_ERROR] Execution failed:`, error);
        return []; 
    }
}

// ==========================================
// 5. MASTER ORCHESTRATOR
// ==========================================

/**
 * ⚙️ High-Performance Search Orchestrator combining Amazon and Walmart.
 */
export async function searchProducts(query: string): Promise<Product[]> {
    console.log("DEBUG starting optimized search for query:", query);
    
    const tasks = [
        scrapeAmazonPage(`https://www.amazon.com/s?k=${encodeURIComponent(query)}&page=1`),
        scrapeAmazonPage(`https://www.amazon.com/s?k=${encodeURIComponent(query)}&page=2`),
        scrapeAmazonPage(`https://www.amazon.com/s?k=${encodeURIComponent(query)}&page=3`),
        scrapeAmazonPage(`https://www.amazon.com/s?k=${encodeURIComponent(query)}&page=4`),
        scrapeAmazonPage(`https://www.amazon.com/s?k=${encodeURIComponent(query)}&page=5`),
        scrapeWalmart(query)
    ];

    const results = await Promise.allSettled(tasks);
    const allResults: Product[] = [];
    
    results.forEach((res, index) => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            allResults.push(...res.value);
            if (index === 5) {
                console.log(`[ORCHESTRATOR] Walmart returned ${res.value.length} items.`);
            }
        } else if (index === 5 && res.status === 'rejected') {
            console.error(`[ORCHESTRATOR] Walmart task rejected:`, res.reason);
        }
    });

    // Deduplicate by ID
    const masterPool = Array.from(new Map(allResults.map(p => [p.id, p])).values());

    return masterPool
        .filter((p: Product) => p.price > 0)
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