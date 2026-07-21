import * as cheerio from 'cheerio';

// ==========================================
// 1. TYPE DEFINITIONS
// ==========================================

export interface Product {
    id: string;
    title: string;
    name: string;
    price: number;
    source: 'amazon' | 'walmart';
    averageRating: number;
    numberOfReviews: number;
    url: string;
    link: string;
    image: string;
    thumbnail: string;
    unit: string;
    amount: number;
    totalAmount: number;
    pricePerUnit: string;
    currency: string;
    originalPrice: number;
    score: number;
}

// ==========================================
// 2. UNIT MATH & SANITIZATION UTILITIES
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

function calculatePricePerUnit(price: number, totalValue: number, unit: string): number {
    if (!totalValue || totalValue <= 0 || isNaN(price)) return price;
    const ppu = price / totalValue;
    return isNaN(ppu) ? price : parseFloat(ppu.toFixed(2));
}

function sanitizeImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('//')) return `https:${url}`;
    if (!url.startsWith('http')) return `https://${url}`;
    return url;
}

// ==========================================
// 3. AMAZON SCRAPER (DECODO NATIVE ENGINE)
// ==========================================

/**
 * 🌐 Scrapes a single page of Amazon search results via Decodo Native API ('amazon_search' target).
 */
async function scrapeAmazonPage(query: string, page: number = 1, timeoutMs: number = 45000): Promise<Product[]> {
    if (!process.env.DECODO_AUTH_TOKEN) {
        console.warn('[AMAZON_NATIVE] Missing DECODO_AUTH_TOKEN.');
        return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`https://scraper-api.decodo.com/v2/scrape`, {
            method: 'POST',
            headers: { 
                'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                target: 'amazon_search',
                query: query,
                headless: 'html',
                page_from: String(page)
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[AMAZON_NATIVE_FAIL] Page ${page} | Status: ${res.status} | Details: ${errText}`);
            return [];
        }

        const data = (await res.json()) as Record<string, any>;
        
        let content: any = null;
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            content = data.results[0].content ?? data.results[0];
        } else if (data.content) {
            content = data.content;
        } else {
            content = data;
        }

        // Mode 1: Pre-parsed JSON payload
        if (typeof content === 'object' && content !== null) {
            const items = Array.isArray(content) 
                ? content 
                : (content.organics || content.items || content.results || content.products || []);

            if (Array.isArray(items) && items.length > 0) {
                return items.map((i: any, index: number): Product | null => {
                    let rawPrice = i.price || i.price_string || i.priceInfo?.currentPrice?.price || 0;
                    if (typeof rawPrice === 'object' && rawPrice !== null) {
                        rawPrice = rawPrice.value || rawPrice.amount || rawPrice.current_price || 0;
                    }
                    const parsedPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
                    if (!parsedPrice || isNaN(parsedPrice) || parsedPrice <= 0) return null;

                    const title = i.title || i.name || 'Unknown Product';
                    const asin = i.asin || i.id || i.product_id;
                    
                    // FORCE-THROUGH: Build a direct, absolute Amazon product detail destination URL
                    const directUrl = asin && !String(asin).startsWith('gen-') && !String(asin).startsWith('cheerio-')
                        ? `https://www.amazon.com/dp/${asin}`
                        : (i.url && i.url.startsWith('http') ? i.url : `https://www.amazon.com${i.url || '/gp/search'}`);

                    const rawImage = i.image || i.thumbnail || i.imageUrl || '';
                    const image = sanitizeImageUrl(rawImage);

                    return {
                        id: `amz-${asin || Math.random().toString(36).substring(7)}`,
                        title,
                        name: title,
                        price: parsedPrice,
                        source: 'amazon',
                        averageRating: parseFloat(i.rating) || 4.5,
                        numberOfReviews: parseInt(i.reviews_count || i.numberOfReviews, 10) || 0,
                        url: directUrl,
                        link: directUrl,
                        image,
                        thumbnail: image,
                        unit: 'count',
                        amount: 1,
                        totalAmount: 1,
                        pricePerUnit: `$${parsedPrice.toFixed(2)}/ea`,
                        currency: 'USD',
                        originalPrice: parsedPrice,
                        score: parsedPrice
                    };
                }).filter((p: Product | null): p is Product => p !== null);
            }
        }

        // Mode 2: Raw HTML string parsing via Cheerio
        const htmlString = typeof content === 'string' ? content : JSON.stringify(content);
        const $ = cheerio.load(htmlString);
        const products: Product[] = [];

        $('div[data-component-type="s-search-result"]').each((index, el) => {
            const title = $(el).find('h2 span, h2 a').text().trim();
            const priceText = $(el).find('.a-price .a-offscreen').first().text().replace(/[^0-9.]/g, '').trim();
            const price = parseFloat(priceText);
            const rawImage = $(el).find('img.s-image').attr('src') || '';
            const image = sanitizeImageUrl(rawImage);
            const asin = $(el).attr('data-asin') || '';
            const directUrl = asin ? `https://www.amazon.com/dp/${asin}` : `https://www.amazon.com`;

            if (title && !isNaN(price) && price > 0) {
                products.push({
                    id: `amz-${asin || index}`,
                    title,
                    name: title,
                    price,
                    source: 'amazon',
                    averageRating: 4.5,
                    numberOfReviews: 0,
                    url: directUrl,
                    link: directUrl,
                    image,
                    thumbnail: image,
                    unit: 'count',
                    amount: 1,
                    totalAmount: 1,
                    pricePerUnit: `$${price.toFixed(2)}/ea`,
                    currency: 'USD',
                    originalPrice: price,
                    score: price
                });
            }
        });

        return products;

    } catch (error) {
        clearTimeout(timeout);
        console.error(`[AMAZON_NATIVE_ERROR] Page ${page} failed:`, error);
        return [];
    }
}

// ==========================================
// 4. WALMART PARSER & DECODO CLIENT
// ==========================================

export function parseWalmart(html: string): Product[] {
    try {
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
        if (!match) return [];
        
        const json = JSON.parse(match[1]);
        const pageProps = json?.props?.pageProps;
        if (!pageProps) return [];

        let rawItems: any[] = 
            pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items ||
            pageProps?.initialSearchResult?.searchResult?.itemStacks?.[0]?.items ||
            pageProps?.searchResult?.itemStacks?.[0]?.items ||
            pageProps?.initialData?.searchResult?.items ||
            [];

        if (!rawItems.length && pageProps?.initialTempoData?.data?.contentLayout?.modules) {
            for (const mod of pageProps.initialTempoData.data.contentLayout.modules) {
                const candidate = mod?.configs?.productsConfig?.products;
                if (Array.isArray(candidate) && candidate.length > 0) {
                    rawItems = candidate;
                    break;
                }
            }
        }

        if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

        return rawItems.map((i: any, index: number): Product | null => {
            const rawPrice = i.priceInfo?.currentPrice?.price || i.price || i.currentPrice || 0;
            const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
            if (!price || isNaN(price) || price <= 0) return null;

            const title = i.name || i.title || i.description || 'Unknown Product';
            const rawUrl = i.canonicalUrl || i.url || i.link || '';
            const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://www.walmart.com${rawUrl}`;
            const rawImage = i.imageInfo?.thumbnailUrl || i.image || i.thumbnail || i.imageUrl || '';
            const image = sanitizeImageUrl(rawImage);

            return {
                id: `wmt-${i.usItemId || i.id || index}`,
                title,
                name: title,
                price,
                source: 'walmart',
                averageRating: i.rating?.averageRating || i.averageRating || 4.5,
                numberOfReviews: i.rating?.numberOfReviews || i.numberOfReviews || 0,
                url: fullUrl,
                link: fullUrl,
                image,
                thumbnail: image,
                unit: 'count',
                amount: 1,
                totalAmount: 1,
                pricePerUnit: `$${price.toFixed(2)}/ea`,
                currency: 'USD',
                originalPrice: price,
                score: price
            };
        }).filter((p: Product | null): p is Product => p !== null);

    } catch (e) {
        console.error('[PARSE_WALMART_ERROR]', e);
        return [];
    }
}

async function scrapeWalmart(query: string, timeoutMs: number = 45000): Promise<Product[]> {
    if (!process.env.DECODO_AUTH_TOKEN) {
        console.warn('[WALMART_NATIVE] Missing DECODO_AUTH_TOKEN.');
        return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
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
                headless: 'html'
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) return [];

        const data = (await res.json()) as Record<string, any>;
        let htmlString = '';
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            htmlString = data.results[0].content || JSON.stringify(data.results[0]);
        } else if (data.content) {
            htmlString = data.content;
        } else {
            htmlString = JSON.stringify(data);
        }

        if (htmlString.includes('px-captcha') || htmlString.includes('Access Denied')) return [];

        return parseWalmart(htmlString);
    } catch (error) {
        clearTimeout(timeout);
        return [];
    }
}

// ==========================================
// 5. MASTER ORCHESTRATOR
// ==========================================

export async function searchProducts(query: string): Promise<Product[]> {
    console.log("DEBUG starting optimized search for query:", query);
    
    const tasks = [
        scrapeAmazonPage(query, 1),
        scrapeAmazonPage(query, 2),
        scrapeAmazonPage(query, 3),
        scrapeWalmart(query)
    ];

    const results = await Promise.allSettled(tasks);
    const allResults: Product[] = [];
    
    results.forEach((res, index) => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            allResults.push(...res.value);
        }
    });

    const masterPool = Array.from(new Map(allResults.map(p => [p.id, p])).values());

    return masterPool
        .filter((p: Product) => p.price > 0 && typeof p.price === 'number' && !isNaN(p.price))
        .map((p: Product) => {
            const unitInfo = parseUnit(p.title);
            const norm = unitInfo ? normalizeUnit(unitInfo) : { unit: 'count', totalValue: 1 };
            const ppu = calculatePricePerUnit(p.price, norm.totalValue, toCanonicalUnit(norm.unit));
            const safeScore = isNaN(ppu) ? p.price : ppu;
            
            return { 
                ...p, 
                score: safeScore
            } as Product;
        })
        .sort((a, b) => (a.score || 9999) - (b.score || 9999));
}