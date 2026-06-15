// lib/seo-matrix.ts

export const RETAILERS = ['amazon', 'walmart', 'costco', 'sams-club', 'target', 'bjs'];
export const BRANDS = ['kirkland', 'members-mark', 'great-value', 'bounty', 'tide', 'charmin', 'purina'];
export const CATEGORIES = ['toilet-paper', 'coffee-pods', 'dog-food', 'laundry-detergent', 'trash-bags', 'paper-towels'];
export const METRICS = ['cost-per-ounce', 'price-per-sheet', 'unit-value-calculator'];

export function generateSlugsByRetailer(retailerId: string): string[] {
  if (!RETAILERS.includes(retailerId)) return [];
  
  const slugs: string[] = [];
  for (const brand of BRANDS) {
    for (const category of CATEGORIES) {
      for (const metric of METRICS) {
        slugs.push(`${retailerId}-${brand}-${category}-${metric}-calculator`);
      }
    }
  }
  return slugs;
}