// app/ledger/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { PortableText } from '@portabletext/react';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';
import { ChevronLeft, Clock, Calendar } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const posts = await client.fetch(`*[_type == "post"] { "slug": slug.current }`);
    return posts.map((post: any) => ({
      slug: post.slug,
    }));
  } catch {
    return [];
  }
}

async function getPost(slug: string) {
  const query = `*[_type == "post" && slug.current == $slug][0] {
    title,
    contentType,
    mainImage,
    videoUrl,
    "audioUrl": audioFile.asset->url,
    publishedAt,
    body
  }`;
  return await client.fetch(query, { slug });
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPost(slug);
  
  if (!post) return { title: 'Entry Not Found - BudgetLynx' };
  
  return {
    title: `${post.title} | Lynx Ledger`,
  };
}

function formatYouTubeEmbed(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

export default async function PostPage(props: Props) {
  const { slug } = await props.params;
  const post = await getPost(slug);

  if (!post) return notFound();

  const embedVideoUrl = formatYouTubeEmbed(post.videoUrl);
  const postDate = post.publishedAt ? new Date(post.publishedAt) : new Date();
  const formattedDate = postDate.toISOString().split('T')[0];

  // Locked Typographic Engine Mappers for Sanity Rich Text Content Blocks
  const portableTextComponents = {
    block: {
      h2: ({ children }: any) => <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight mt-10 mb-4 font-sans text-left">{children}</h2>,
      h3: ({ children }: any) => <h3 className="text-lg font-bold text-zinc-200 tracking-tight mt-8 mb-3 font-sans text-left">{children}</h3>,
      normal: ({ children }: any) => <p className="text-base text-zinc-300 font-normal leading-relaxed mb-6 font-sans text-left">{children}</p>,
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-rose-500 pl-4 my-6 italic text-zinc-400 text-left bg-zinc-900/30 py-2 pr-2 rounded-r">
          {children}
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }: any) => <ul className="list-disc pl-6 mb-6 space-y-2 text-zinc-300 text-left">{children}</ul>,
      number: ({ children }: any) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-zinc-300 text-left">{children}</ol>,
    },
    marks: {
      link: ({ children, value }: any) => (
        <a href={value?.href} target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:text-rose-300 underline font-medium transition-colors">
          {children}
        </a>
      ),
      code: ({ children }: any) => <code className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-sm font-mono text-rose-300 font-medium">{children}</code>,
    },
    types: {
      image: ({ value }: any) => {
        const imgUrl = urlForImage(value)?.url();
        if (!imgUrl) return null;
        return (
          <div className="relative w-full aspect-video my-8 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900---">
            <Image src={imgUrl} alt="Article imagery block" fill className="object-cover" sizes="(max-w: 768px) 100vw, 700px" />
          </div>
        );
      },
    },
  };

  const headerLabel = {
    article: 'EDITORIAL REVIEW',
    podcast: 'BROADCAST TRANSCRIPT',
    video: 'MEDIA PREVIEW LOG',
  }[post.contentType as string] || 'SYSTEM LOG ENTRY';

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-rose-500 selection:text-black">
      
      {/* SEAMLESS CONTENT LAYOUT WRAPPER */}
      <div className="max-w-2xl mx-auto px-6 pt-32 pb-24">
        
        {/* RETRO-NAVIGATION SYSTEM TRIGGER */}
        <Link 
          href="/ledger" 
          className="inline-flex items-center gap-1 text-xs font-mono font-bold tracking-wider text-zinc-500 hover:text-rose-400 transition-colors uppercase mb-8 group"
        >
          <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" /> Back to wire
        </Link>

        {/* MAIN STORY TITLES & HEADER STACK */}
        <header className="mb-8">
          <div className="text-[10px] font-black font-mono tracking-widest text-rose-500 uppercase mb-2">
            // {headerLabel}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight leading-tight text-left">
            {post.title}
          </h1>
          
          {/* ARTICLE METADATA TICKER */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-zinc-900 font-mono text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-600" />
              <time>{formattedDate}</time>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-600" />
              <span>
                {post.contentType === 'video' ? '12 min watch' : post.contentType === 'podcast' ? '45 min listen' : '6 min read'}
              </span>
            </div>
          </div>
        </header>

        {/* SECURE MEDIA EXECUTION AREA */}
        <div className="mb-8 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
          {post.contentType === 'video' && embedVideoUrl && (
            <div className="aspect-video w-full">
              <iframe 
                src={embedVideoUrl} 
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {post.contentType === 'podcast' && post.audioUrl && (
            <div className="p-6 bg-zinc-900/40">
              {post.mainImage && (
                <div className="relative w-48 h-48 mx-auto mb-6 overflow-hidden rounded-md border border-zinc-800">
                  <Image 
                    src={urlForImage(post.mainImage).url()} 
                    alt={post.title} 
                    fill
                    className="shadow-lg object-cover"
                  />
                </div>
              )}
              <audio controls className="w-full accent-rose-500">
                <source src={post.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio playback controls.
              </audio>
            </div>
          )}

          {post.contentType === 'article' && post.mainImage && (
            <div className="relative w-full aspect-video">
              <Image 
                src={urlForImage(post.mainImage).url()} 
                alt={post.title} 
                fill 
                className="object-cover"
                priority
              />
            </div>
          )}
        </div>

        {/* CORE EDITORIAL WORKSPACE EXECUTION */}
        <main className="w-full overflow-x-auto">
          {post.body ? (
            <PortableText value={post.body} components={portableTextComponents} />
          ) : (
            <p className="text-center italic text-zinc-500 py-6 font-mono text-xs">NO BODY DATA PROVIDED // INTERRUPT</p>
          )}
        </main>

        {/* BOTTOM TERMINAL FOOTER LINKS */}
        <div className="mt-20 pt-8 border-t border-zinc-900">
          <Link href="/ledger" className="text-rose-400 font-mono text-xs uppercase font-bold hover:underline inline-flex items-center gap-1.5 group">
            <span className="transition-transform group-hover:-translate-x-0.5">←</span> Back to Lynx Ledger
          </Link>
        </div>
      </div>
    </div>
  );
}