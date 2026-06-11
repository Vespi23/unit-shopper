// sanity/schemaTypes/productQuery.ts
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'productQuery',
  title: 'Programmatic Target Query',
  type: 'document',
  fields: [
    defineField({
      name: 'keyword',
      title: 'Target Search Keyword',
      type: 'string',
      description: 'The raw lowercase target string (e.g., "4c energy rush packets").'
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: {
        source: 'keyword',
        maxLength: 96,
      }
    }),
    defineField({
      name: 'category',
      title: 'CPG Category',
      type: 'string',
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last Scraped/Verified At',
      type: 'datetime'
    })
  ]
})