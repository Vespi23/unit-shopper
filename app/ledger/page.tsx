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
  excerpt?: string;
}

async function getPosts(): Promise<LedgerPost[]> {
  const query = `*[_type == "post"] | order(publishedAt desc) {
    title,
    contentType,
    "slug": slug.current,
    publishedAt,
    excerpt
  }`;

  try {
    const data = await client.fetch(query);
    return data || [];
  } catch (error) {
    console.error("Ledger database query error logging:", error);
    return [];
  }
}

export default async function LedgerPage() {
  const posts = await getPosts();

  // Low-saturation color tokens mapping to Sanity content primitives
  const formatBadgeMap: Record<string, { label: string; utilities: string; duration: string }> = {
    article: { label: 'ARTICLE', utilities: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', duration: '6 min read' },
    podcast: { label: 'AUDIO', utilities: 'bg-amber-500/10 text-amber-400 border-amber-500/20', duration: '45 min audio' },
    video: { label: 'VIDEO', utilities: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', duration: '12 min watch' },
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans antialiased selection:bg-blue-600 selection:text-white">
      <div className="max-w-6xl mx-auto">
        
        {/* PUBLIC DIRECTORY BROADCAST HEADER */}
        <div className="mb-8 pb-6 border-b border-zinc-800/80">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 font-mono">LYNX_LEDGER //</h1>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">
            A linear compilation of tech analyses, operational data systems documentation, and regular informational updates.
          </p>
        </div>

        {/* COMPACT DATA TABLE COMPONENT */}
        <div className="bg-zinc-900 border border-zinc-800 rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
              
              {/* STRUCTURAL COLUMN HEADERS */}
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-xs font-mono uppercase tracking-wider text-zinc-400">
                  <th className="w-[100px] py-3 px-4 font-medium">Format</th>
                  <th className="w-auto py-3 px-4 font-medium">Index Title & Excerpt Snippet</th>
                  <th className="w-[110px] py-3 px-4 font-medium text-right hidden sm:table-cell">Length</th>
                  <th className="w-[110px] py-3 px-4 font-medium text-right">Published</th>
                </tr>
              </thead>

              {/* RESOURCE LOG MATRIX ROWS */}
              <tbody className="divide-y divide-zinc-800/60 font-sans text-sm">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center font-mono text-xs text-zinc-500">
                      INDEX COMPILATION STATE: ZERO RECORDS RELEASED
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => {
                    const badge = formatBadgeMap[post.contentType] || { 
                      label: 'RAW', 
                      utilities: 'bg-zinc-800 text-zinc-400 border-zinc-700/60',
                      duration: '3 min read'
                    };
                    const detailRoute = `/ledger/${post.slug || '#'}`;

                    return (
                      <tr 
                        key={post.slug || post.title} 
                        className="hover:bg-zinc-800/30 transition-colors duration-150 ease-out group"
                      >
                        {/* FORMAT CATEGORY INDICATOR */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-[74px] py-0.5 text-[9px] font-extrabold font-mono tracking-widest rounded border ${badge.utilities}`}>
                            {badge.label}
                          </span>
                        </td>
                        
                        {/* TITLE & DESCRIPTION LOG EXPANSION ZONE */}
                        <td className="py-3.5 px-4 min-w-0">
                          <div className="flex flex-col truncate w-full">
                            <Link 
                              href={detailRoute}
                              className="font-semibold text-zinc-200 hover:text-blue-400 transition-colors duration-150 block truncate"
                            >
                              {post.title}
                            </Link>
                            {post.excerpt && (
                              <p className="text-xs text-zinc-500 truncate mt-0.5 font-normal max-w-4xl group-hover:text-zinc-400 transition-colors duration-150">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* ESTIMATED LENGTH METRIC */}
                        <td className="py-3.5 px-4 font-mono text-xs text-zinc-400 text-right whitespace-nowrap hidden sm:table-cell">
                          {badge.duration}
                        </td>
                        
                        {/* CHRONO RECORD EXTENSION STAMP */}
                        <td className="py-3.5 px-4 font-mono text-xs text-zinc-400 text-right whitespace-nowrap">
                          {post.publishedAt 
                            ? new Date(post.publishedAt).toISOString().split('T')[0] 
                            : '0000-00-00'
                          }
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