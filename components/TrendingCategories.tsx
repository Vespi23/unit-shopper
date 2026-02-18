import { Search } from 'lucide-react';

const CATEGORIES = [
    { name: 'Toilet Paper', query: 'Toilet Paper', icon: '🧻' },
    { name: 'Paper Towels', query: 'Paper Towels', icon: '🧻' },
    { name: 'Coffee', query: 'Coffee Beans', icon: '☕' },
    { name: 'Laundry Detergent', query: 'Laundry Detergent', icon: '🧺' },
    { name: 'Protein Powder', query: 'Whey Protein', icon: '💪' },
    { name: 'Batteries', query: 'AA Batteries', icon: '🔋' },
    { name: 'Diapers', query: 'Diapers size 4', icon: '👶' },
    { name: 'Trash Bags', query: 'Kitchen Trash Bags', icon: '🗑️' },
];

interface TrendingCategoriesProps {
    onSelect: (query: string) => void;
}

export function TrendingCategories({ onSelect }: TrendingCategoriesProps) {
    return (
        <section className="w-full max-w-4xl px-4 mt-12 mb-20">
            <h3 className="text-sm font-semibold text-muted-foreground text-center mb-6 uppercase tracking-wider">
                Trending Categories
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.name}
                        onClick={() => onSelect(cat.query)}
                        className="flex items-center gap-2 px-4 py-2 bg-background border border-border/50 rounded-full shadow-sm hover:shadow-md hover:border-emerald-500/50 hover:text-emerald-600 transition-all text-sm font-medium"
                    >
                        <span>{cat.icon}</span>
                        {cat.name}
                    </button>
                ))}
            </div>
        </section>
    );
}
