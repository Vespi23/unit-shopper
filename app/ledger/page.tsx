// app/ledger/page.tsx
import Link from 'next/link' // 1. CRITICAL: Import Next.js routing wrapper
import { client } from '@/sanity/lib/client'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPosts() {
  const query = `*[_type == "post"] | order(publishedAt desc) {
    title,
    contentType,
    "slug": slug.current,
    mainImage,
    publishedAt
  }`;

  try {
    const data = await client.fetch(query);
    return data || [];
  } catch (error) {
    console.error("Ledger query failure trace:", error);
    return [];
  }
}

export default async function LedgerPage() {
  const posts = await getPosts();

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No ledger entries found on live cloud dataset.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Lynx Ledger</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post: any) => (
          // 2. Wrap the card inside an optimized Link tracking layout
          <Link 
            key={post.slug || post.title} 
            href={`/ledger/${post.slug || '#'}`}
            className="block border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-900 group"
          >
            <div>
              <span className="text-xs font-semibold uppercase px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                {post.contentType || 'Article'}
              </span>
              
              {/* Added a subtle color transition effect on hover to indicate usability */}
              <h2 className="text-xl font-bold mt-2 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                {post.title}
              </h2>
              
              <p className="text-gray-400 text-xs mt-1">
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Draft Date'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}