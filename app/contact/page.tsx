
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronLeft, Send, Mail } from 'lucide-react';

export default function ContactPage() {
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

            <div className="space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Contact Us</h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        We're here to help. Send us a message or check our FAQs below.
                    </p>
                </div>

                <div className="max-w-xl mx-auto">
                    <Card className="shadow-lg border-muted/60">
                        <CardHeader>
                            <CardTitle>Send a Message</CardTitle>
                            <CardDescription>
                                Fill out the form below and we'll get back to you as soon as possible.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                action="https://formsubmit.co/successinventor511@gmail.com"
                                method="POST"
                                className="space-y-4"
                            >
                                {/* Honeypot for bots */}
                                <input type="text" name="_honey" className="hidden" />
                                <input type="hidden" name="_captcha" value="false" />

                                <div className="space-y-2">
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

                                <div className="space-y-2">
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

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Message</label>
                                    <textarea
                                        name="message"
                                        id="message"
                                        required
                                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                        placeholder="How can we help you?"
                                    ></textarea>
                                </div>

                                <Button type="submit" className="w-full font-bold">
                                    <Send className="w-4 h-4 mr-2" /> Send Message
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="max-w-3xl mx-auto pt-8 border-t border-border">
                    <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>How do you calculate unit prices?</AccordionTrigger>
                            <AccordionContent>
                                We automatically extract unit sizes (oz, count, lb) from product titles and divide the current price by that amount to give you a standardized cost per unit. This allows you to compare "apples to apples" across different pack sizes.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Are the prices real-time?</AccordionTrigger>
                            <AccordionContent>
                                Yes, we fetch pricing data directly from major retailers like Amazon and Walmart. However, prices can change rapidly, so we always recommend verifying the final price on the retailer's site before purchasing.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>Do you sell these products directly?</AccordionTrigger>
                            <AccordionContent>
                                No, BudgetLynx is a price comparison tool. We do not sell products or handle shipping. When you click "View Deal," you are taken to the retailer's website to complete your purchase.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger>How does BudgetLynx make money?</AccordionTrigger>
                            <AccordionContent>
                                We participate in affiliate programs. If you make a purchase through our links, we may earn a small commission at no extra cost to you. This helps support our free service.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </div>
    );
}
