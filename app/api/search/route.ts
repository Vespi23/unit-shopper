import { NextResponse } from 'next/server';
import { scrapePage } from '@/lib/api-client';
import { Product } from '@/lib/types';
import { parseUnit, normalizeUnit, toCanonicalUnit, calculatePricePerUnit } from '@/lib/unit-parser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const sortStrategy = searchParams.get('sort') || 'ppu';

    if (!query.trim()) {
        return NextResponse.json([], { status: 200 });
    }

    const allResults: Product[] = [];
    const pages = [1, 2, 3, 4, 5, 6, 7];
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

    const processed = Array.from(new Map(allResults.map(p => [p.id, p])).values())
        .filter((p: Product) => p.price > 0 && (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 100)
        .map((p: Product) => {
             const unitInfo = parseUnit(p.title);
             const norm = unitInfo ? normalizeUnit(unitInfo) : { unit: 'count', totalValue: 1 };
             const ppu = parseFloat(String(calculatePricePerUnit(p.price, norm.totalValue, toCanonicalUnit(norm.unit)))) || p.price;
             return { 
                 ...p, 
                 score: ppu, 
                 pricePerUnit: `$${ppu.toFixed(2)}/${toCanonicalUnit(norm.unit)}` 
             } as Product;
        });

    if (sortStrategy === 'price_asc') {
        processed.sort((a, b) => a.price - b.price);
    } else {
        processed.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));
    }

    return NextResponse.json(processed, {
        headers: { 'Cache-Control': 'no-store' }
    });
}