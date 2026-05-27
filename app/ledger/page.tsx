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
}

async function getPosts(): Promise<LedgerPost[]> {
  const query = `*[_type == "post"] | order(publishedAt desc) {
    title,
    contentType,
    "slug": slug.current,
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
      <div className="w-full min-h-screen bg-zinc-950 text-zinc-400 flex flex-col items-center justify-center p-6 font-sans">
        <div className="border border-zinc-800 p-8 rounded bg-zinc-900/50 text-center max-w-md">
          <p className="text-xs font-mono tracking-widest text-zinc-500">SYSTEM STATE // NULL</p>
          <p className="text-zinc-300 mt-2 text-sm">No ledger entries found on live cloud dataset.</p>
        </div>
      </div>
    );
  }

  // Pure memory-space metrics processing from query response
  const totalCount = posts.length;
  const articlesCount = posts.filter(p => p.contentType === 'article').length;
  const podcastsCount = posts.filter(p => p.contentType === 'podcast').length;
  const videosCount = posts.filter(p => p.contentType === 'video').length;

  // Exact map configurations containing dynamic visual tokens matching Sanity constants
  const typeBadgeMap: Record<string, { label: string; utilityStyles: string }> = {
    article: { label: 'DOC 📝', utilityStyles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    podcast: { label: 'AUD 🎙️', utilityStyles: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    video: { label: 'VID 🎥', utilityStyles: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
      <div className="max-w-6xl mx-auto">
        
        {/* RESOURCE MATRIX METRIC STATUS RIBBON */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded shadow-sm">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">Index Volume</span>
            <span className="text-2xl font-bold text-zinc-100 mt-1 font-mono block">{totalCount}</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded shadow-sm">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">Articles</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 font-mono block">{articlesCount}</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded shadow-sm">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">Podcasts</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 font-mono block">{podcastsCount}</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded shadow-sm">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">Videos</span>
            <span className="text-2xl font-bold text-cyan-400 mt-1 font-mono block">{videosCount}</span>
          </div>
        </div>

        {/* HIGH DENSITY LEDGER DATA DISPLAY LAYER */}
        <div className="bg-zinc-900 border border-zinc-800 rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
              
              {/* LEDGER MATRIX COLUMN BOUNDARIES */}
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-xs font-mono uppercase tracking-wider text-zinc-400">
                  <th className="w-[100px] py-3 px-4 font-medium">Type</th>
                  <th className="w-auto py-3 px-4 font-medium">Ledger Entry Headline Identifier</th>
                  <th className="w-[200px] py-3 px-4 font-medium hidden md:table-cell">URI Slug String</th>
                  <th className="w-[120px] py-3 px-4 font-medium text-right">Commit Date</th>
                </tr>
              </thead>

              {/* ITERATIVE LOG LAYOUT EXECUTION */}
              <tbody className="divide-y divide-zinc-800/60 font-sans text-sm">
                {posts.map((post) => {
                  const badgeConfig = typeBadgeMap[post.contentType] || { 
                    label: 'RAW 📄', 
                    utilityStyles: 'bg-zinc-800 text-zinc-400 border-zinc-700/60' 
                  };
                  const calculatedRoute = `/ledger/${post.slug || '#'}`;

                  return (
                    <tr 
                      key={post.slug || post.title} 
                      className="hover:bg-zinc-800/30 transition-colors duration-700 ease-out group"
                    >
                      {/* CAPSULE ALLOCATION TYPE */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold font-mono rounded border ${badgeConfig.utilityStyles}`}>
                          {badgeConfig.label}
                        </span>
                      </td>
                      
                      {/* RESOURCE LINK TITLE LINK INTERACTION */}
                      <td className="py-3 px-4 truncate font-medium text-zinc-200">
                        <Link 
                          href={calculatedRoute}
                          className="hover:text-blue-400 text-zinc-200 transition-colors block w-full truncate"
                        >
                          {post.title}
                        </Link>
                      </td>

                      {/* INTERNAL ROUTE MONITOR FIELD */}
                      <td className="py-3 px-4 font-mono text-xs text-zinc-500 truncate hidden md:table-cell group-hover:text-zinc-400 transition-colors">
                        /{post.slug || 'null'}
                      </td>
                      
                      {/* IMMUTABLE CHRONO STAMP LAYER */}
                      <td className="py-3 px-4 font-mono text-xs text-zinc-400 text-right whitespace-nowrap">
                        {post.publishedAt 
                          ? new Date(post.publishedAt).toISOString().split('T')[0] 
                          : '0000-00-00'
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  );
}