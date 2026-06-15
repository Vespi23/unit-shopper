// lib/seo-matrix.ts

export const RETAILERS = ['amazon', 'walmart', 'costco', 'sams-club', 'target', 'bjs'];

// Explicitly map brands to logical categories to eliminate nonsense combinations
export const BRAND_MAPPING: Record<string, string[]> = {
  'kirkland': ['toilet-paper', 'coffee-pods', 'dog-food', 'laundry-detergent', 'trash-bags', 'paper-towels'],
  'members-mark': ['toilet-paper', 'coffee-pods', 'dog-food', 'laundry-detergent', 'trash-bags', 'paper-towels'],
  'great-value': ['toilet-paper', 'coffee-pods', 'dog-food', 'laundry-detergent', 'trash-bags', 'paper-towels'],
  'bounty': ['paper-towels'],
  'charmin': ['toilet-paper'],
  'tide': ['laundry-detergent'],
  'purina': ['dog-food']
};

// PATCHED: Cleared tailing "-calculator" substrings to fix duplicate token generation loops
export const METRICS = ['cost-per-ounce', 'price-per-sheet', 'unit-value'];

/**
 * Generates programmatic slug structures matching clean patterns:
 * {retailer}-{brand}-{category}-{metric}-calculator
 */
export function generateSlugsByRetailer(retailerId: string): string[] {
  if (!RETAILERS.includes(retailerId)) return [];
  
  const slugs: string[] = [];
  
  for (const [brand, categories] of Object.entries(BRAND_MAPPING)) {
    for (const category of categories) {
      for (const metric of METRICS) {
        slugs.push(`${retailerId}-${brand}-${category}-${metric}-calculator`);
      }
    }
  }
  return slugs;
}