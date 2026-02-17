import { Product } from './types';

export const MOCK_PRODUCTS: Omit<Product, 'unitInfo' | 'pricePerUnit' | 'score' | 'originalPrice'>[] = [
    {
        id: 'amz-1',
        title: "Skippy Creamy Peanut Butter, 16.3 oz Jar",
        price: 3.48,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Skippy+16oz',
        link: 'https://www.amazon.com/dp/B000000000',
        source: 'amazon',
        rating: 4.8,
        reviews: 12000
    },
    {
        id: 'wm-1',
        title: "Skippy Creamy Peanut Butter, 40 oz (Pack of 2)",
        price: 12.98,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Skippy+40oz+x2',
        link: 'https://www.walmart.com/ip/123456789',
        source: 'walmart',
        rating: 4.7,
        reviews: 500
    },
    {
        id: 'amz-2',
        title: "Jif Creamy Peanut Butter, 16 Ounce (Pack of 3)",
        price: 10.29,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Jif+16oz+x3',
        link: 'https://www.amazon.com/dp/B000000001',
        source: 'amazon',
        rating: 4.9,
        reviews: 8500
    },
    {
        id: 'wm-2',
        title: "Great Value Creamy Peanut Butter, 64 oz",
        price: 5.94,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=GV+64oz',
        link: 'https://www.walmart.com/ip/987654321',
        source: 'walmart',
        rating: 4.5,
        reviews: 3000
    },
    // Coffee
    {
        id: 'amz-3',
        title: "Starbucks Pike Place Roast Ground Coffee, 28 Oz",
        price: 19.98,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Starbucks+28oz',
        link: 'https://www.amazon.com/dp/B000000002',
        source: 'amazon',
        rating: 4.8,
        reviews: 45000
    },
    {
        id: 'wm-3',
        title: "Folgers Classic Roast Ground Coffee, 40.3 oz",
        price: 13.58,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Folgers+40oz',
        link: 'https://www.walmart.com/ip/112233445',
        source: 'walmart',
        rating: 4.6,
        reviews: 12000
    },
    {
        id: 'amz-4',
        title: "Dunkin' Original Blend Ground Coffee, 30 Ounce Canister",
        price: 21.34,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Dunkin+30oz',
        link: 'https://www.amazon.com/dp/B000000003',
        source: 'amazon',
        rating: 4.7,
        reviews: 15600
    },
    // Laundry
    {
        id: 'amz-5',
        title: "Tide HE Turbo Clean Liquid Laundry Detergent, Original, 100 fl oz, 64 Loads",
        price: 12.97,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Tide+100floz',
        link: 'https://www.amazon.com/dp/B000000004',
        source: 'amazon',
        rating: 4.8,
        reviews: 25000
    },
    {
        id: 'wm-4',
        title: "Tide Liquid Laundry Detergent, Original, 37 fl oz, 24 Loads",
        price: 5.44,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Tide+37floz',
        link: 'https://www.walmart.com/ip/223344556',
        source: 'walmart',
        rating: 4.7,
        reviews: 5000
    },
    {
        id: 'amz-6',
        title: "Gain liquid laundry detergent, 154 fl oz, 107 loads",
        price: 15.94,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Gain+154floz',
        link: 'https://www.amazon.com/dp/B000000005',
        source: 'amazon',
        rating: 4.8,
        reviews: 12000
    },
    // Paper
    {
        id: 'amz-7',
        title: "Bounty Quick Size Paper Towels, 12 Family Rolls = 30 Regular Rolls",
        price: 33.58,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Bounty+12Rolls',
        link: 'https://www.amazon.com/dp/B000000006',
        source: 'amazon',
        rating: 4.8,
        reviews: 55000
    },
    {
        id: 'wm-5',
        title: "Bounty Quick Size Paper Towels, 6 Double Rolls = 12 Regular Rolls",
        price: 11.98,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Bounty+6Rolls',
        link: 'https://www.walmart.com/ip/334455667',
        source: 'walmart',
        rating: 4.7,
        reviews: 8900
    },
    {
        id: 'amz-8',
        title: "Charmin Ultra Soft Toilet Paper, 24 Mega Rolls = 96 Regular Rolls",
        price: 32.99,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Charmin+24Rolls',
        link: 'https://www.amazon.com/dp/B000000007',
        source: 'amazon',
        rating: 4.9,
        reviews: 42000
    },
    // Beverages
    {
        id: 'amz-9',
        title: "Coca-Cola Original Soda Pop, 12 Fl Oz, 35 Pack Cans",
        price: 16.98,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Coke+35pk',
        link: 'https://www.amazon.com/dp/B000000008',
        source: 'amazon',
        rating: 4.7,
        reviews: 1200
    },
    {
        id: 'wm-6',
        title: "Coca-Cola Soda Pop, 12 fl oz, 12 Pack Cans",
        price: 7.28,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Coke+12pk',
        link: 'https://www.walmart.com/ip/445566778',
        source: 'walmart',
        rating: 4.6,
        reviews: 3500
    },
    // Diapers
    {
        id: 'amz-10',
        title: "Pampers Swaddlers Disposable Baby Diapers, Size 1, 198 Count",
        price: 55.94,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Pampers+198ct',
        link: 'https://www.amazon.com/dp/B000000009',
        source: 'amazon',
        rating: 4.9,
        reviews: 34000
    },
    {
        id: 'wm-7',
        title: "Pampers Swaddlers Disposable Baby Diapers, Size 1, 96 Count",
        price: 26.97,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Pampers+96ct',
        link: 'https://www.walmart.com/ip/556677889',
        source: 'walmart',
        rating: 4.8,
        reviews: 8000
    },
    // Trash Bags
    {
        id: 'amz-11',
        title: "Glad ForceFlex Tall Kitchen Trash Bags, 13 Gallon, 110 Count",
        price: 23.49,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Glad+110ct',
        link: 'https://www.amazon.com/dp/B000000010',
        source: 'amazon',
        rating: 4.8,
        reviews: 45000
    },
    {
        id: 'wm-8',
        title: "Great Value Tall Kitchen Trash Bags, 13 Gallon, 120 Count",
        price: 15.98,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=GV+120ct',
        link: 'https://www.walmart.com/ip/667788990',
        source: 'walmart',
        rating: 4.4,
        reviews: 12000
    },
    // Pet Food
    {
        id: 'amz-12',
        title: "Purina ONE SmartBlend Natural Adult Chicken & Rice Formula Dry Dog Food, 40 lb. Bag",
        price: 53.98,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Purina+40lb',
        link: 'https://www.amazon.com/dp/B000000011',
        source: 'amazon',
        rating: 4.7,
        reviews: 28000
    },
    {
        id: 'wm-9',
        title: "Purina ONE SmartBlend Natural Adult Chicken & Rice Formula Dry Dog Food, 8 lb. Bag",
        price: 15.48,
        currency: 'USD',
        image: 'https://placehold.co/200x200?text=Purina+8lb',
        link: 'https://www.walmart.com/ip/778899001',
        source: 'walmart',
        rating: 4.6,
        reviews: 3500
    }
];
