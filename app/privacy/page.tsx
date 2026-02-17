
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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

            <article className="prose prose-slate dark:prose-invert max-w-none">
                <h1>Privacy Policy</h1>
                <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>

                <p>
                    At BudgetLynx ("we," "us," or "our"), accesible from this website, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by BudgetLynx and how we use it.
                </p>

                <h2>1. Information We Collect</h2>
                <p>
                    We deliberately minimize the data we collect.
                </p>
                <ul>
                    <li><strong>Local Storage:</strong> We store your "Shopping List" preferences locally on your device. This data is not sent to our servers.</li>
                    <li><strong>Analytics:</strong> We use privacy-friendly analytics to understand website usage trends (e.g., page views, search popularity) without tracking individual users across the web.</li>
                </ul>

                <h2>2. Third-Party Services</h2>
                <p>
                    We may employ third-party companies and individuals due to the following reasons:
                </p>
                <ul>
                    <li><strong>Affiliate Partners:</strong> This site participates in affiliate marketing programs (e.g., Amazon Associates, Walmart Affiliate Program). If you click on a link and make a purchase, we may earn a commission at no extra cost to you. These third parties may use cookies to track referrals.</li>
                    <li><strong>Search Providers:</strong> Product data is retrieved via third-party APIs (e.g., SerpApi) which aggregate public information.</li>
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
                    If you have any questions about this Privacy Policy, please contact us via the website administrator.
                </p>
            </article>
        </div>
    );
}
