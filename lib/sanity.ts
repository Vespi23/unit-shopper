import imageUrlBuilder from '@sanity/image-url';
import { client } from '../sanity/lib/client'; // Reuses your intact sanity/lib/client.ts asset

const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  if (!source || !source.asset) return null;
  return builder.image(source);
}

export { client };

export const ALL_POSTS_QUERY = `*[_type == "post"] | order(publishedAt desc) {
  title,
  slug,
  contentType,
  excerpt,
  mainImage,
  publishedAt
}`;

export const POST_BY_SLUG_QUERY = `*[_type == "post" && slug.current == $slug][0] {
  title,
  contentType,
  mainImage,
  videoUrl,
  "audioUrl": audioFile.asset->url,
  publishedAt,
  body
}`;