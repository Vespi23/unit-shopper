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
    console.error("Ledger database connection exception:", error);
    return [];
  }
}

export default async function LedgerPage() {
  const posts = await getPosts();

  // Content type badge display profiles
  const typeMap: Record<string, { label: string; styling: string }> = {
    article: { label: 'ARTICLE', styling: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    podcast: { label: 'AUDIO', styling: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    video: { label: 'VIDEO', styling: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans antialiased selection:bg-blue-600 selection:text-white">
      <div className="max-w-6xl mx-auto">
        
        {/* CUSTOMER HEADER & CTA BANNER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Lynx Knowledge Ledger</h1>
            <p className="text-sm text-zinc-400 mt-1">Master your financial workflows with strategic deep-dives, video models, and platform documentation.</p>
          </div>
          <Link 
            href="/auth/signup" 
            className="shrink-0 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded shadow transition-colors duration-150"
          >
            Open Free Account
          </Link>
        </div>

        {/* VALUE PROP AND ONBOARDING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded">
            <h3 className="text-sm font-semibold text-zinc-200">🔍 Dynamic Tracking</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">Our advanced tracking tools make it easy to monitor account performance and flow velocity down to the penny.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded">
            <h3 className="text-sm font-semibold text-zinc-200">🛡️ Enterprise Security</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">Your data infrastructure is completely siloed and guarded behind robust, multi-layer verification mechanisms.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded">
            <h3 className="text-sm font-semibold text-zinc-200">⚡ High-Speed Engine</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">Automate spreadsheet accounting processes with directly integrated live banking ledger synchronization points.</p>
          </div>
        </div>

        {/* CUSTOMER DIRECTORY DESEGREGATION GRAPH */}
        <div className="bg-zinc-900 border border-zinc-800 rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
              
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-xs font-mono uppercase tracking-wider text-zinc-400">
                  <th className="w-[100px] py-3.5 px-4 font-medium">Format</th>
                  <th className="w-auto py-3.5 px-4 font-medium">Resource Module Title</th>
                  <th className="w-[100px] py-3.5 px-4 font-medium text-right hidden sm:table-cell">Interval</th>
                  <th className="w-[110px] py-3.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60 font-sans text-sm">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center font-mono text-xs text-zinc-500">
                      INDEX STATUS: NO PUBLIC ENTRIES RELEASED
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => {
                    const badge = typeMap[post.contentType] || { label: 'RAW', styling: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
                    const detailRoute = `/ledger/${post.slug || '#'}`;

                    return (
                      <tr 
                        key={post.slug || post.title} 
                        className="hover:bg-zinc-800/30 transition-colors duration-150 ease-in-out group"
                      >
                        {/* FORMAT ICON CAPSULE */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-[74px] py-0.5 text-[9px] font-extrabold font-mono tracking-widest rounded border ${badge.styling}`}>
                            {badge.label}
                          </span>
                        </td>
                        
                        {/* RESOURCE STRATEGIC EXPLANATORY COLUMN */}
                        <td className="py-3.5 px-4 min-w-0">
                          <div className="flex flex-col truncate w-full">
                            <Link 
                              href={detailRoute}
                              className="font-semibold text-zinc-200 hover:text-blue-400 transition-colors duration-150 block truncate"
                            >
                              {post.title}
                            </Link>
                            {post.excerpt && (
                              <p className="text-xs text-zinc-500 truncate mt-0.5 font-normal max-w-3xl group-hover:text-zinc-400 transition-colors duration-150">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* ESTIMATED READING TIME PROFILE */}
                        <td className="py-3.5 px-4 font-mono text-xs text-zinc-400 text-right whitespace-nowrap hidden sm:table-cell">
                          {post.contentType === 'video' ? '12 min video' : post.contentType === 'podcast' ? '45 min audio' : '6 min read'}
                        </td>
                        
                        {/* NAVIGATION ACCESS POINT ACTION */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link 
                            href={detailRoute}
                            className="inline-flex items-center justify-center font-medium text-xs text-blue-500 group-hover:text-blue-400 transition-colors duration-150"
                          >
                            Explore <span className="ml-1 transition-transform duration-150 transform group-hover:translate-x-0.5">→</span>
                          </Link>
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