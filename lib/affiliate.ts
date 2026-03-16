import { Product } from './types';

// Define the configuration object
const AFFILIATE_CONFIG = {
    amazon: {
        enabled: true,
        tag: "budgetlynx-20" // Your Amazon Associate Tag
    },
    walmart: {
        enabled: false, // Set to true once you have Impact Radius set up
        impactId: ""
    }
};

// REGEX 1: Matches standard and mobile path structures (PATCHED: Alphanumeric ASIN support)
const ASIN_PATH_REGEX = /(?:dp|o|ASIN|gp\/product|gp\/offer-listing|gp\/product\/ajax|gp\/aw\/d)\/(B[A-Z0-9]{9}|[0-9]{9}(?:X|[0-9]))/i;

// REGEX 2: Fallback for query string ASINs (PATCHED: Alphanumeric ASIN support)
const ASIN_QUERY_REGEX = /(?:[?&]asin=)(B[A-Z0-9]{9}|[0-9]{9}(?:X|[0-9]))/i;

export function getAffiliateLink(product: Product): string {
    if (!product.link) return '#';

    try {
        const url = new URL(product.link);

        // Security Check: Ensure protocol is http or https
        if (!['http:', 'https:'].includes(url.protocol)) {
            console.warn('Blocked non-http URL:', product.link);
            return '#';
        }

        const source = product.source.toLowerCase();

        if (source.includes('amazon') && AFFILIATE_CONFIG.amazon.enabled) {
            // 1. Try to extract the exact ASIN using your existing Regex
            const asinMatch = product.link.match(ASIN_PATH_REGEX) || product.link.match(ASIN_QUERY_REGEX);
            
            if (asinMatch && asinMatch[1]) {
                // 2. SUCCESS! Rebuild a 100% clean URL with zero scraper junk
                return `https://www.amazon.com/dp/${asinMatch[1]}?tag=${AFFILIATE_CONFIG.amazon.tag}`;
            }

            // 3. FALLBACK: If Regex fails, append the tag as safely as possible
            url.searchParams.delete('tag'); // Remove existing tag
            url.searchParams.set('tag', AFFILIATE_CONFIG.amazon.tag);
            return url.toString();
        }

        if (source.includes('walmart') && AFFILIATE_CONFIG.walmart.enabled) {
            // Walmart: Usually requires wrapping in Impact Radius URL
            // For now, we'll just return the original URL as we don't have the format yet
            // thorough implementation would look like:
            // return `https://goto.walmart.com/c/${AFFILIATE_CONFIG.walmart.impactId}/...&u=${encodeURIComponent(product.link)}`;
            return product.link;
        }

        return product.link;
    } catch (e) {
        console.error("Invalid product URL", e);
        return product.link;
    }
}

export function getAmazonAffiliateLink(asin: string): string {
    return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_CONFIG.amazon.tag}`;
}