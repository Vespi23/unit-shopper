export interface Product {
    id: string;
    title: string;
    price: number;
    currency: string;
    image: string;
    link: string;
    source: string; // Used directly as your retailer indicator string ('amazon' | 'walmart')
    averageRating?: number;
    numberOfReviews?: number;

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
    ppuFormatted?: string; // FIXED: Added to explicitly enable type checking on product badges
    score?: number; 
}

export type SortOption = 'price_asc' | 'price_desc' | 'unit_price_asc';