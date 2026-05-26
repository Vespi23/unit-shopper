import Link from 'next/link';
import Image from 'next/image';
import { FileText, Headphones, Video } from 'lucide-react';
import { urlFor } from '@/lib/sanity';

interface PostListItem {
  title: string;
  slug: { current: string };
  contentType: 'article' | 'podcast' | 'video';
  excerpt?: string;
  mainImage?: any;
  publishedAt: string;
}

export function BlogCard({ post }: { post: PostListItem }) {
  const imageUrl = post.mainImage ? urlFor(post.mainImage)?.url() : null;
  
  const Icon = {
    article: FileText,
    podcast: Headphones,
    video: Video,
  }[post.contentType || 'article'] || FileText;

  return (
    <article className="group relative flex flex-col space-y-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted border border-border">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-102"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Icon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        
        <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm border border-border">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="capitalize">{post.contentType || 'Article'}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <h2 className="text-xl font-bold tracking-tight text-foreground line-clamp-2 transition-colors group-hover:text-primary">
            <Link href={`/blog/${post.slug.current}`}>
              <span className="absolute inset-0 z-10" />
              {post.title}
            </Link>
          </h2>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </div>
        
        <div className="mt-4 pt-2 border-t border-border/50 text-xs font-medium text-primary flex items-center gap-1">
          View Content <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </article>
  );
}