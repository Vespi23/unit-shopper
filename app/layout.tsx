import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CookieConsent } from '@/components/CookieConsent';
import { FeedbackPrompt } from '@/components/FeedbackPrompt';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";

// 1. Explicitly added display: "swap" to ensure fallback fonts don't block rendering
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", 
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BudgetLynx - See What Others Miss. Shop by Unit Price.",
    template: "%s | BudgetLynx",
  },
  description: "Stop overpaying on Amazon. Compare true unit prices (per oz, count, lb) instantly to find the best bulk deals and savings.",
  keywords: ["unit price calculator", "amazon price comparison", "bulk savings", "price per ounce", "amazon deals", "grocery comparison"],
  authors: [{ name: "BudgetLynx" }],
  creator: "BudgetLynx",
  metadataBase: new URL('https://www.budgetlynx.com'),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.budgetlynx.com",
    title: "BudgetLynx - Find the True Best Deal on Amazon",
    description: "Don't get tricked by confusing package sizes. We calculate the REAL unit price so you save money on every shop.",
    siteName: "BudgetLynx",
    images: [
      {
        url: "/logo.png", // SEO FIX: Direct mapping for social previews
        width: 1200,
        height: 630,
        alt: "BudgetLynx - See What Others Miss",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BudgetLynx - Unit Price Search",
    description: "Compare unit prices across Amazon per ounce, count, or pound.",
    creator: "@BudgetLynx",
    images: ["/logo.png"], // SEO FIX: Twitter Card preview
  },
  other: {
    "impact-site-verification": "81bc5835-fc1d-41ed-94be-799749315bd0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 2. Grouped core visual layout together */}
          <div className="flex flex-col min-h-screen relative w-full">
            <Header />
            <main className="flex-grow w-full">
              {children}
            </main>
            <Footer />
          </div>

          {/* 3. Grouped non-flow overlay and script components at the bottom */}
          <Analytics />
          <SpeedInsights />
          <CookieConsent />
          <FeedbackPrompt />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}