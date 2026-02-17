import { NextResponse } from 'next/server';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { searchProducts } from '@/lib/api-client';
import { Product } from '@/lib/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        let results: Product[] = [];
        let usedMock = false;

        // 1. Try Real API if key is present
        if (process.env.SERPAPI_KEY) {
            console.log(`Fetching real data for: ${query}`);
            try {
                // Default to Amazon as requested
                results = await searchProducts(query, 'amazon');
            } catch (e) {
                console.error("Real API failed, falling back to mock", e);
            }
        }

        // 2. Fallback to Mock Data if no results
        if (results.length === 0) {
            console.log(`Using mock data for: ${query} (Fallback or No Key)`);
            usedMock = true;

            // Filter mock data
            const lowerQuery = query.toLowerCase();
            const mockData = MOCK_PRODUCTS as unknown as Product[];

            const filteredMock = mockData.filter((p: Product) =>
                p.title.toLowerCase().includes(lowerQuery) ||
                p.source.toLowerCase().includes(lowerQuery)
            );

            // Calculate unit prices for mock data
            const { parseUnit, calculatePricePerUnit } = await import('@/lib/unit-parser');

            results = filteredMock.map((item) => {
                const unitInfo = parseUnit(item.title);
                const price = item.price;
                let pricePerUnit = 'N/A';

                let unit: any = 'unknown';
                let value = 0;
                let totalValue = 0;

                if (unitInfo) {
                    unit = unitInfo.unit;
                    value = unitInfo.value;
                    totalValue = unitInfo.totalValue;
                    pricePerUnit = calculatePricePerUnit(price, unitInfo.totalValue, unitInfo.unit);
                }

                return {
                    ...item,
                    unit: unit,
                    amount: value,
                    totalAmount: totalValue,
                    pricePerUnit: pricePerUnit,
                    score: (totalValue > 0 && price > 0) ? (price / totalValue) : (price > 0 ? price : 999999),
                    originalPrice: 0
                };
            });
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
