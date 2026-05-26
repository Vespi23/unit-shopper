// schemaTypes/post.ts
export default {
  name: 'post',
  title: 'Lynx Ledger Entry',
  type: 'document',
  fields: [
    { name: 'title', title: 'Headline', type: 'string' },
    {
      name: 'contentType',
      title: 'Content Type',
      type: 'string',
      options: {
        list: [
          { title: 'Article 📝', value: 'article' },
          { title: 'Podcast 🎙️', value: 'podcast' },
          { title: 'Video 🎥', value: 'video' },
        ],
        layout: 'radio',
      },
    },
    { name: 'slug', title: 'URL Slug', type: 'slug', options: { source: 'title' } },
    { name: 'mainImage', title: 'Cover Image / Thumbnail', type: 'image', options: { hotspot: true } },
    {
      name: 'videoUrl',
      title: 'YouTube/Vimeo URL',
      type: 'url',
      hidden: ({ document }: any) => document?.contentType !== 'video',
    },
    {
      name: 'audioFile',
      title: 'Podcast MP3 File',
      type: 'file',
      hidden: ({ document }: any) => document?.contentType !== 'podcast',
    },
    { name: 'publishedAt', title: 'Published at', type: 'datetime' },
    { name: 'body', title: 'Content Body', type: 'array', of: [{ type: 'block' }, { type: 'image' }] },
  ],
}