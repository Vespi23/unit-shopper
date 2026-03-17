import { Product } from './types';

// Define the configuration object - Focused exclusively on Amazon
const AFFILIATE_CONFIG = {
    amazon: {
        enabled: true,
        tag: "budgetlynx-20"
    }
};

// REGEX 1: Matches standard and mobile path structures (PATCHED: Alphanumeric ASIN support)
const ASIN_PATH_REGEX = /(?:dp|o|ASIN|gp\/product|gp\/offer-listing|gp\/product\/ajax|gp\/aw\/d)\/(B[A-Z0-9]{9}|[0-9]{9}(?:X|[0-9]))/i;

// REGEX 2: Fallback for query string ASINs (PATCHED: Alphanumeric ASIN support)
const ASIN_QUERY_REGEX = /(?:[?&]asin=)(B[A-Z0-9]{9}|[0-9]{9}(?:X|[0-9]))/i;

/**
 * Generates an affiliate link. 
 * Strips tracking/scraper junk and rebuilds clean Amazon URLs.
 */
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

        // Handle Amazon Logic
        if (source.includes('amazon') && AFFILIATE_CONFIG.amazon.enabled) {
            const asinMatch = product.link.match(ASIN_PATH_REGEX) || product.link.match(ASIN_QUERY_REGEX);
            
            if (asinMatch && asinMatch[1]) {
                // Rebuild clean URL with Tag
                return `https://www.amazon.com/dp/${asinMatch[1]}?tag=${AFFILIATE_CONFIG.amazon.tag}`;
            }

            // Fallback: Append tag to existing URL structure
            url.searchParams.delete('tag');
            url.searchParams.set('tag', AFFILIATE_CONFIG.amazon.tag);
            return url.toString();
        }

        // Default: Return original link for all other sources
        return product.link;
    } catch (e) {
        console.error("Invalid product URL", e);
        return product.link;
    }
}

/**
 * Direct ASIN to Affiliate Link conversion
 */
export function getAmazonAffiliateLink(asin: string): string {
    return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_CONFIG.amazon.tag}`;
}