export interface Product {
    id: string;
    title: string;
    price: number;
    currency: string;
    image: string;
    link: string;
    source: string;
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
    // Flattened fields for easier access if needed, matching current usage
    unit?: string;
    amount?: number;
    totalAmount?: number;

    originalPrice: number;
    pricePerUnit?: string;
    score?: number; // Calculated field for sorting
}

export type SortOption = 'price_asc' | 'price_desc' | 'unit_price_asc';
