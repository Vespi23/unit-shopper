import { type SchemaTypeDefinition } from 'sanity'
import post from './post' // Import the Lynx Ledger schema

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [post], // Register it here
}