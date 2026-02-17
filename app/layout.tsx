import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";
import { ShoppingListProvider } from '@/components/ShoppingListContext';
import { CookieConsent } from '@/components/CookieConsent';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BudgetLynx - Unit Price Search",
  description: "Compare unit prices across Amazon and Walmart instantly.",
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
        <ShoppingListProvider>
          <Header />
          <div className="flex-grow">
            {children}
          </div>
          <Footer />

          <Analytics />
          <CookieConsent />
        </ShoppingListProvider>
      </body>
    </html>
  );
}
