// sanity/schemaTypes/index.ts
import { type SchemaTypeDefinition } from 'sanity'
import post from './post' // Import the Lynx Ledger schema
import productQuery from './productQuery' // Import your automated target queries schema

// FIXED: Restored the explicit object configuration export to prevent sanity.config.ts lookups from failing
export const schema: { types: SchemaTypeDefinition[] } = {
  // Both schemas are now properly registered within the central type compiler array
  types: [post, productQuery], 
}