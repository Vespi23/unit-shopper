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
    
    unit?: string;
    amount?: number;
    totalAmount?: number;

    // NEW FIELD
    aiVerified?: boolean; 

    originalPrice: number;
    pricePerUnit?: string;
    score?: number; 
}

export type SortOption = 'price_asc' | 'price_desc' | 'unit_price_asc';
