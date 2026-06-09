// sanity/structure.ts
import type { StructureResolver } from 'sanity/structure';

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Lynx Core Content Studio')
    .items([
      // Bucket 1: Manual Editorial Content Workspace (The Ledger Blog)
      S.listItem()
        .title('Ledger Wire Entries')
        .schemaType('post')
        .child(
          S.documentTypeList('post')
            .title('Active Editorial Wire')
        ),

      // Hard structural divider line to enforce interface separation boundaries
      S.divider(),

      // Bucket 2: Automated Scraper Key Targets (Isolated Programmatic Factory)
      S.listItem()
        .title('Programmatic SEO Factory')
        .schemaType('productQuery')
        .child(
          S.documentTypeList('productQuery')
            .title('Automated Target Queries')
        ),

      // Catch-all array pipeline: Automatically preserves visibility for any un-mapped schemas
      ...S.documentTypeListItems().filter(
        (item) => !['post', 'productQuery'].includes(item.getId() ?? '')
      ),
    ]);