export interface Product {
    id: string;
    title: string;
    price: number;
    currency: string;
    image: string;
    link: string;
    source: 'amazon' | 'walmart';
    rating?: number;
    reviews?: number;

    // Computed Fields
    unitInfo?: {
        value: number;
        unit: string;
        quantity: number;
        totalValue: number;
        formatted: string;
    };
    pricePerUnit?: string;
    score?: number; // Internal score for sorting (lower is better)
}

export type SortOption = 'price_asc' | 'price_desc' | 'unit_price_asc';
