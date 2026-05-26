import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { PortableText } from '@portabletext/react';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60; // Auto-regenerate cached layout components on active traffic shifts

// Generate pre-compiled static pathways for optimized delivery parameters
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

// Complete metadata rendering with asynchronous support structures
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPost(slug);
  
  if (!post) return { title: 'Entry Not Found - BudgetLynx' };
  
  return {
    title: `${post.title} | Lynx Ledger`,
  };
}

// Robust parsing engine to process standard, desktop, and mobile shortened YouTube addresses safely
function formatYouTubeEmbed(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

export default async function PostPage(props: Props) {
  const { slug } = await props.params; // Correctly unpack async parameters
  const post = await getPost(slug);

  if (!post) return notFound();

  const embedVideoUrl = formatYouTubeEmbed(post.videoUrl);
  const postDate = post.publishedAt ? new Date(post.publishedAt) : new Date();

  // Custom component structures to automatically handle embedded images within the text layout safely
  const portableTextComponents = {
    types: {
      image: ({ value }: any) => {
        const imgUrl = urlForImage(value)?.url();
        if (!imgUrl) return null;
        return (
          <div className="relative my-8 aspect-video w-full rounded-2xl overflow-hidden border border-border">
            <Image src={imgUrl} alt="Ledger Content Artwork" fill className="object-cover" />
          </div>
        );
      },
    },
  };

  return (
    <article className="min-h-screen bg-background pt-32 pb-20 text-foreground">
      <div className="container px-4 mx-auto max-w-4xl">
        
        {/* TOP META */}
        <div className="mb-8 text-center">
          <span className="text-primary font-bold uppercase tracking-widest text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            {post.contentType || 'Entry'}
          </span>
          <h1 className="text-4xl md:text-6xl font-black mt-4 mb-6 tracking-tight leading-tight">
            {post.title}
          </h1>
          <p className="text-muted-foreground italic">
            Published on {postDate.toLocaleDateString('en-US', { dateStyle: 'long' })}
          </p>
        </div>

        {/* MEDIA PLAYER SECTION */}
        <div className="mb-12 rounded-3xl overflow-hidden shadow-2xl bg-card border border-border/50">
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
            <div className="p-8 bg-muted/40">
               {post.mainImage && (
                 <Image 
                   src={urlForImage(post.mainImage).url()} 
                   alt={post.title} 
                   width={400} 
                   height={400} 
                   className="rounded-2xl mx-auto mb-8 shadow-lg object-cover aspect-square"
                 />
               )}
               <audio controls className="w-full accent-primary">
                 <source src={post.audioUrl} type="audio/mpeg" />
                 Your browser does not support the audio playback controls.
               </audio>
            </div>
          )}

          {post.contentType === 'article' && post.mainImage && (
            <div className="relative h-[400px] w-full bg-muted">
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

        {/* RICH TEXT BODY */}
        {post.body ? (
          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-a:text-primary leading-relaxed">
            <PortableText value={post.body} components={portableTextComponents} />
          </div>
        ) : (
          <p className="text-center italic text-muted-foreground py-6">No body data provided.</p>
        )}

        <div className="mt-20 pt-10 border-t border-border/50">
          <Link href="/ledger" className="text-primary font-bold hover:underline inline-flex items-center gap-1.5 group">
            <span className="transition-transform group-hover:-translate-x-0.5">←</span> Back to Lynx Ledger
          </Link>
        </div>
      </div>
    </article>
  );
}