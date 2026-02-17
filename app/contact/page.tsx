
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Mail, MapPin } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="container max-w-3xl py-12 px-4 md:px-6">
            <div className="mb-8">
                <Link href="/">
                    <Button variant="ghost" className="pl-0 gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Search
                    </Button>
                </Link>
            </div>

            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-4">Contact Us</h1>
                    <p className="text-muted-foreground text-lg">
                        Have questions, feedback, or need support? We're here to help.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="p-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 rounded-full bg-primary/10 text-primary">
                                <Mail className="h-6 w-6" />
                            </div>
                            <h2 className="font-semibold text-xl">Email Us</h2>
                        </div>
                        <p className="text-muted-foreground mb-4">
                            For general inquiries, support, or partnership opportunities.
                        </p>
                        <a href="mailto:hello@budgetlynx.com" className="text-primary font-medium hover:underline">
                            hello@budgetlynx.com
                        </a>
                    </div>

                    <div className="p-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 rounded-full bg-primary/10 text-primary">
                                <MapPin className="h-6 w-6" />
                            </div>
                            <h2 className="font-semibold text-xl">Mailing Address</h2>
                        </div>
                        <p className="text-muted-foreground">
                            FinFlow LLC<br />
                            123 Commerce St, Suite 100<br />
                            New York, NY 10001
                        </p>
                    </div>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none pt-8 border-t border-border">
                    <h3>Frequently Asked Questions</h3>

                    <h4>How do you calculate unit prices?</h4>
                    <p>We automatically extract unit sizes (oz, count, lb) from product titles and divide the current price by that amount to give you a standardized cost per unit.</p>

                    <h4>Are the prices real-time?</h4>
                    <p>Yes, we fetch pricing data directly from major retailers. However, prices can change rapidly, so always verify on the retailer's site.</p>
                </div>
            </div>
        </div>
    );
}
