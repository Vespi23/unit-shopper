
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Send } from 'lucide-react';

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
                        Have questions, feedback, or need support? Send us a message below.
                    </p>
                </div>

                <div className="max-w-2xl mx-auto">
                    {/* Contact Form */}
                    <div className="p-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                        <h2 className="font-semibold text-xl mb-6">Send a Message</h2>
                        <form
                            action="https://formsubmit.co/successinventor511@gmail.com"
                            method="POST"
                            className="space-y-4"
                        >
                            {/* Honeypot for bots */}
                            <input type="text" name="_honey" className="hidden" />
                            {/* Disable Captcha for smoother UX (optional) */}
                            <input type="hidden" name="_captcha" value="false" />
                            {/* Success Page Redirect (optional, defaults to generic success) */}
                            {/* <input type="hidden" name="_next" value="http://localhost:3000/contact?success=true" /> */}

                            <div className="grid gap-2">
                                <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Your Name"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="your.email@example.com"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label htmlFor="message" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Message</label>
                                <textarea
                                    name="message"
                                    id="message"
                                    required
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="How can we help you?"
                                ></textarea>
                            </div>

                            <Button type="submit" className="w-full">
                                <Send className="w-4 h-4 mr-2" /> Send Message
                            </Button>
                        </form>
                    </div>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none pt-8 border-t border-border mt-8">
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
