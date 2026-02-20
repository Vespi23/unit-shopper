import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import { Product } from '@/lib/types';

// Mock Next.js Image component
vi.mock('next/image', () => ({
    default: (props: any) => <img {...props} />,
}));

// Mock useABTest hook
vi.mock('@/hooks/useABTest', () => ({
    useABTest: () => ({
        variant: 'control',
        trackConversion: vi.fn(),
        isReady: true,
    }),
}));

const mockProduct: Product = {
    id: '123',
    title: 'Test Product Title',
    price: 20.00,
    currency: 'USD',
    image: '/test-image.jpg',
    link: 'https://example.com',
    rating: 4.8,
    reviews: 50,
    pricePerUnit: '$2.00/unit',
    originalPrice: 25.00,
    unitInfo: { unit: 'unit', value: 10, totalValue: 10, quantity: 1, formatted: '10 unit' },
    source: 'amazon'
};

describe('ProductCard', () => {
    it('renders product details correctly', () => {
        render(
            <ProductCard
                product={mockProduct}
                onClick={() => { }}
                onSelect={() => { }}
                isSelected={false}
            />
        );

        expect(screen.getByText('Test Product Title')).toBeInTheDocument();
        expect(screen.getByText('$20.00')).toBeInTheDocument();
        expect(screen.getByText('$2.00/unit')).toBeInTheDocument();
        expect(screen.getByText('4.8')).toBeInTheDocument();
    });

    it('calls onSelect when checkbox is clicked', () => {
        const onSelect = vi.fn();
        render(
            <ProductCard
                product={mockProduct}
                onClick={() => { }}
                onSelect={onSelect}
                isSelected={false}
            />
        );

        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        expect(onSelect).toHaveBeenCalledWith('123', true);
    });
});
