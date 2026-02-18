import { ScanEye, Calculator, ShoppingBag } from 'lucide-react';

export function FeaturesSection() {
    return (
        <section className="w-full py-20 bg-emerald-900/5 dark:bg-emerald-900/10">
            <div className="container px-4 mx-auto max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4">Why use BudgetLynx?</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Retailers use confusing package sizes to hide the true cost. We do the math for you.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Feature 1 */}
                    <div className="bg-card p-8 rounded-3xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                            <ScanEye className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Lynx Vision</h3>
                        <p className="text-muted-foreground">
                            We scan thousands of Amazon products and normalize the data to reveal the hidden "Per Unit" price.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-card p-8 rounded-3xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Context Aware</h3>
                        <p className="text-muted-foreground">
                            We know that toilet paper is measured by "sheets" and laundry detergent by "loads", not just pounds.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-card p-8 rounded-3xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Smart Savings</h3>
                        <p className="text-muted-foreground">
                            Stop overpaying for bulk items that aren't actually a deal. Find the true best value instantly.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
