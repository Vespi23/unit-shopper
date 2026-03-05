
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
                    <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                </CardHeader>
                <CardContent className="pt-6">
                    <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-p:leading-7 prose-li:my-1">
                        <p>
                            At BudgetLynx (operated by FinFlow LLC, "we," "us," or "our"), accessible from this website and the Lynx Vision browser extension, one of our main priorities is the privacy of our visitors and users. This Privacy Policy document contains types of information that is collected and recorded by BudgetLynx and how we use it.
                        </p>

                        <h2>1. Information We Collect</h2>
                        <p>
                            We deliberately minimize the data we collect across all our platforms.
                        </p>
                        <ul>
                            <li><strong>Local Storage (Website):</strong> We store your "Shopping List" preferences locally on your device. This data is not sent to our servers.</li>
                            <li><strong>Analytics (Website):</strong> We use privacy-friendly analytics to understand website usage trends (e.g., page views, search popularity) without tracking individual users across the web.</li>
                            <li><strong>Lynx Vision Extension:</strong> The Lynx Vision browser extension operates entirely on your device. It requests permission to read and change data strictly on `amazon.com` domains to inject unit price badges. <strong>The extension does not track your browsing history, does not collect personal information, and does not send Amazon product data or your user data to our servers.</strong> All unit price calculations happen locally in your browser.</li>
                        </ul>

                        <h2>2. Third-Party Services</h2>
                        <p>
                            We may employ third-party companies and individuals due to the following reasons:
                        </p>
                        <ul>
                            <li><strong>Affiliate Partners:</strong> Both our website and the Lynx Vision extension participate in affiliate marketing programs. If you click on a product link (either on our site or via the extension's unit price badges) and make a purchase, we may earn a commission at no extra cost to you. These affiliate networks (e.g. Amazon Associates) may use cookies to track referrals.</li>
                            <li><strong>Search Providers (Website):</strong> Product data on our main website is retrieved via third-party APIs which aggregate public information. The extension, however, reads data directly from the page you are viewing.</li>
                        </ul>

                        <h2>3. Children's Privacy (COPPA Compliance)</h2>
                        <p>
                            Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us. If we become aware that we have collected Personal Data from anyone under the age of 13 without verification of parental consent, we take steps to remove that information from our servers.
                        </p>

                        <h2>4. Changes to This Privacy Policy</h2>
                        <p>
                            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
                        </p>

                        <h2>5. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please <Link href="/contact" className="text-primary font-medium hover:underline">contact us</Link>.
                        </p>
                    </article>
                </CardContent>
            </Card>
        </div>
    );
}
