import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import { Product } from '@/lib/types';
import userEvent from '@testing-library/user-event';

// Mock the useShoppingList hook
const mockAddToList = vi.fn();
const mockRemoveFromList = vi.fn();
const mockIsInList = vi.fn();

vi.mock('./ShoppingListContext', () => ({
    useShoppingList: () => ({
        addToList: mockAddToList,
        removeFromList: mockRemoveFromList,
        isInList: mockIsInList,
    }),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
    default: (props: any) => <img {...props} />,
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
        expect(onSelect).toHaveBeenCalledWith(true);
    });

    it('toggles shopping list when button is clicked', async () => {
        mockIsInList.mockReturnValue(false);
        render(
            <ProductCard
                product={mockProduct}
                onClick={() => { }}
                onSelect={() => { }}
                isSelected={false}
            />
        );

        const addButton = screen.getByTitle('Add to list');
        fireEvent.click(addButton);
        expect(mockAddToList).toHaveBeenCalledWith(mockProduct);
    });
});
