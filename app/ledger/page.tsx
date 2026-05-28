// app/ledger/page.tsx
import Link from 'next/link';
import { client } from '@/sanity/lib/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface LedgerPost {
  title: string;
  contentType: 'article' | 'podcast' | 'video' | string;
  slug: string;
  publishedAt: string | null;
  _createdAt: string;
  excerpt?: string;
}

async function getPosts(): Promise<LedgerPost[]> {
  const query = `*[_type == "post"] | order(publishedAt desc, _createdAt desc) {
    title,
    contentType,
    "slug": slug.current,
    publishedAt,
    _createdAt,
    excerpt
  }`;

  try {
    const data = await client.fetch(query);
    return data || [];
  } catch (error) {
    console.error("Ledger entertainment query engine fault:", error);
    return [];
  }
}

export default async function LedgerPage() {
  const posts = await getPosts();

  // Entertainment badge style system mapping directly onto Sanity primitives
  const entertainmentMap: Record<string, { label: string; textStyle: string }> = {
    article: { label: 'REVIEW 📝', textStyle: 'text-rose-400' },
    podcast: { label: 'SHOW 🎙️', textStyle: 'text-purple-400' },
    video: { label: 'PREVIEW 🎥', textStyle: 'text-amber-400' },
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-rose-500 selection:text-black">
      {/* MINIMALIST CENTERED COLUMN WORKSPACE */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        
        {/* STREAM BRANDING HEADER */}
        <div className="mb-12">
          <h1 className="text-sm font-black tracking-widest text-zinc-400 font-mono uppercase">
            LYNX_LEDGER // <span className="text-rose-500 font-bold">ENTERTAINMENT_WIRE</span>
          </h1>
          <div className="w-12 h-[2px] bg-rose-500 mt-3" />
        </div>

        {/* FEED ITEM STREAM */}
        <div className="divide-y divide-zinc-900">
          {posts.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-zinc-600 tracking-wider">
              FEED STATUS // NO_ENTRIES_FOUND
            </div>
          ) : (
            posts.map((post) => {
              const meta = entertainmentMap[post.contentType] || { 
                label: 'LOG 📄', 
                textStyle: 'text-zinc-400' 
              };
              const targetRoute = `/ledger/${post.slug || '#'}`;

              // Universal date calculation engine
              const liveTimestamp = post.publishedAt || post._createdAt;
              const cleanDate = liveTimestamp 
                ? new Date(liveTimestamp).toISOString().split('T')[0] 
                : 'RECENT';

              return (
                <article 
                  key={post.slug || post.title} 
                  className="py-8 first:pt-0 last:pb-0 group relative flex flex-col items-start"
                >
                  {/* METADATA TRACKING BAR */}
                  <div className="flex items-center gap-3 mb-2 font-mono text-xs">
                    <span className={`font-black tracking-wider ${meta.textStyle}`}>
                      {meta.label}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <time className="text-zinc-500 font-medium tracking-tight">
                      {cleanDate}
                    </time>
                  </div>

                  {/* HIGH-CONTRAST CLICKABLE HEADING */}
                  <h2 className="text-lg font-extrabold text-zinc-100 tracking-tight group-hover:text-rose-400 transition-colors duration-150 ease-out leading-snug">
                    <Link href={targetRoute} className="focus:outline-none">
                      {post.title}
                    </Link>
                  </h2>

                  {/* DEEP OPTIMIZED EXCERPT TEXT */}
                  {post.excerpt && (
                    <p className="mt-2 text-sm text-zinc-400 font-normal leading-relaxed text-left line-clamp-3 group-hover:text-zinc-300 transition-colors duration-150">
                      {post.excerpt}
                    </p>
                  )}

                  {/* SUBTLE INTERACTION INLINE ANCHOR */}
                  <div className="mt-3 flex items-center text-xs font-semibold uppercase tracking-wider text-rose-500/80 group-hover:text-rose-400 transition-colors duration-150 font-mono">
                    Read Post <span className="ml-1 transition-transform duration-150 transform group-hover:translate-x-1">→</span>
                  </div>
                </article>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}