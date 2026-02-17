
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
    return (
        <div className="container max-w-4xl py-12 px-4 md:px-6">
            <div className="mb-8">
                <Link href="/">
                    <Button variant="ghost" className="pl-0 gap-2 hover:bg-transparent hover:text-primary transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Search
                    </Button>
                </Link>
            </div>

            <Card className="shadow-lg border-muted/60">
                <CardHeader className="pb-4 border-b border-border/50">
                    <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                </CardHeader>
                <CardContent className="pt-6">
                    <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-p:leading-7 prose-li:my-1">
                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using BudgetLynx (operated by FinFlow LLC, the "Service"), you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the Service.
                        </p>

                        <h2>2. Data Accuracy (No Warranty)</h2>
                        <p>
                            BudgetLynx aggregates product pricing and availability from third-party retailers (e.g., Amazon, Walmart). **We do not guarantee the accuracy, completeness, or timeliness of this information.** Prices and availability are subject to change without notice. Always verify the final price on the retailer's website before purchasing.
                        </p>

                        <h2>3. Affiliate Disclosure</h2>
                        <p>
                            BudgetLynx is a participant in the Amazon Services LLC Associates Program and other affiliate programs. We earn commissions from qualifying purchases made through links on this site. This helps support our free service.
                        </p>

                        <h2>4. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, BudgetLynx shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from your use of the Service or reliance on any information provided by the Service.
                        </p>

                        <h2>5. User Conduct</h2>
                        <p>
                            You agree not to use the Service for any unlawful purpose or to scrape, harvest, or extract data from the Service without our express written consent.
                        </p>

                        <h2>6. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these Terms at any time. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
                        </p>

                        <h2>7. Contact Us</h2>
                        <p>
                            If you have any questions about these Terms, please <Link href="/contact" className="text-primary font-medium hover:underline">contact us</Link>.
                        </p>
                    </article>
                </CardContent>
            </Card>
        </div>
    );
}
