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
  _createdAt: string; // Fetch system creation date as an ironclad fallback
  excerpt?: string;
}

async function getPosts(): Promise<LedgerPost[]> {
  // CRITICAL: Updated GROQ query to pull the system's absolute creation timestamp (_createdAt)
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

  const entertainmentMap: Record<string, { label: string; utilityStyles: string; featureMetric: string }> = {
    article: { label: 'REVIEW 📝', utilityStyles: 'bg-rose-500/10 text-rose-400 border-rose-500/20', featureMetric: 'CRITIC LOG: 9/10' },
    podcast: { label: 'SHOW 🎙️', utilityStyles: 'bg-purple-500/10 text-purple-400 border-purple-500/20', featureMetric: 'EPISODE STREAM' },
    video: { label: 'PREVIEW 🎥', utilityStyles: 'bg-amber-500/10 text-amber-400 border-amber-500/20', featureMetric: '4K ULTRA_HD' },
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans antialiased selection:bg-rose-500 selection:text-black">
      <div className="max-w-6xl mx-auto">
        
        {/* ENTERTAINMENT DIRECTORY BROADCAST HEADER */}
        <div className="mb-8 pb-6 border-b border-zinc-800/80">
          <h1 className="text-2xl font-black tracking-tighter text-zinc-100 font-mono">LYNX_LEDGER // <span className="text-rose-500">ENTERTAINMENT_WIRE</span></h1>
          <p className="text-xs text-zinc-400 mt-2 max-w-2xl leading-relaxed font-medium">
            Your high-density terminal feed covering media reviews, cultural breakdowns, streaming broadcasts, and content previews.
          </p>
        </div>

        {/* HIGH-DENSITY CONTENT MATRIX TABLE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
              
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-xs font-mono uppercase tracking-wider text-zinc-500">
                  <th className="w-[120px] py-3.5 px-4 font-bold">Genre</th>
                  <th className="w-auto py-3.5 px-4 font-bold">Feature Headline / Content Log</th>
                  <th className="w-[130px] py-3.5 px-4 font-bold text-right hidden sm:table-cell">Feed Status</th>
                  <th className="w-[110px] py-3.5 px-4 font-bold text-right">Logged</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/50 font-sans text-sm">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center font-mono text-xs text-zinc-600">
                      FEED STATUS // NULL_RECORDS_RELEASED
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => {
                    const meta = entertainmentMap[post.contentType] || { 
                      label: 'LOG 📄', 
                      utilityStyles: 'bg-zinc-800 text-zinc-400 border-zinc-700/60',
                      featureMetric: 'GENERAL CONTENT'
                    };
                    const targetRoute = `/ledger/${post.slug || '#'}`;

                    // FORCE-THROUGH WORKAROUND: If publishedAt date field is null, pull the immutable system date
                    const liveTimestamp = post.publishedAt || post._createdAt;
                    const cleanDate = liveTimestamp 
                      ? new Date(liveTimestamp).toISOString().split('T')[0] 
                      : 'RECENT';

                    return (
                      <tr 
                        key={post.slug || post.title} 
                        className="hover:bg-zinc-900/60 transition-all duration-150 ease-in-out group"
                      >
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-[88px] py-0.5 text-[9px] font-black font-mono tracking-widest rounded border ${meta.utilityStyles}`}>
                            {meta.label}
                          </span>
                        </td>
                        
                        <td className="py-4 px-4 min-w-0">
                          <div className="flex flex-col truncate w-full">
                            <Link 
                              href={targetRoute}
                              className="font-bold text-sm text-zinc-100 hover:text-rose-400 transition-colors duration-100 block truncate tracking-tight"
                            >
                              {post.title}
                            </Link>
                            {post.excerpt && (
                              <p className="text-xs text-zinc-400 truncate mt-1 font-normal max-w-4xl group-hover:text-zinc-300 transition-colors duration-100 leading-normal">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono text-xs text-zinc-400 text-right font-semibold whitespace-nowrap hidden sm:table-cell group-hover:text-zinc-300 transition-colors">
                          {meta.featureMetric}
                        </td>
                        
                        {/* INVARIANT CHRONO MATRIX OUTPUT */}
                        <td className="py-4 px-4 font-mono text-xs text-zinc-500 text-right whitespace-nowrap">
                          {cleanDate}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  );
}