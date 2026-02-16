import { Product } from './types';

// Replace these with real tags once approved
const AFFILIATE_CONFIG = {
    amazon: {
        tag: 'bangyourbuck-20', // Placeholder
        enabled: true
    },
    walmart: {
        impactId: '', // Placeholder for Impact Radius ID
        enabled: true
    }
};

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
            // Amazon: Append ?tag=xyz
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
