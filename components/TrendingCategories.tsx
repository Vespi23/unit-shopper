import Link from 'next/link';
import { TRENDING_CATEGORIES } from '@/lib/categories';

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
                {TRENDING_CATEGORIES.map((cat) => (
                    <Link
                        key={cat.name}
                        href={`/?q=${encodeURIComponent(cat.query)}`}
                        onClick={() => onSelect(cat.query)}
                        className="flex items-center gap-2 px-4 py-2 bg-background border border-border/50 rounded-full shadow-sm hover:shadow-md hover:border-emerald-500/50 hover:text-emerald-600 transition-all text-sm font-medium"
                    >
                        <span>{cat.icon}</span>
                        {cat.name}
                    </Link>
                ))}
            </div>
        </section>
    );
}
