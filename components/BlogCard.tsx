// components/BlogCard.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileText, Headphones, Video } from 'lucide-react';
import { urlFor } from '@/lib/sanity';

interface PostListItem {
  title: string;
  slug: { current: string };
  contentType: 'article' | 'podcast' | 'video' | string;
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
  }[post.contentType] || FileText;

  // Precise status styling maps tied directly into Sanity core schema keys
  const statusBadgeMap: Record<string, { label: string; utilities: string }> = {
    article: { label: 'DOC 📝', utilities: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    podcast: { label: 'AUD 🎙️', utilities: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    video: { label: 'VID 🎥', utilities: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  };

  const badge = statusBadgeMap[post.contentType] || { 
    label: 'RAW 📄', 
    utilities: 'bg-zinc-800 text-zinc-400 border-zinc-700/60' 
  };

  return (
    <article className="group relative w-full border-b border-zinc-800/80 bg-zinc-950 hover:bg-zinc-900/40 transition-all duration-200 ease-out py-3.5 px-4 flex items-center gap-4 min-w-0">
      
      {/* 1. HIGH-DENSITY COMPACT THUMBNAIL CONTAINER */}
      <div className="relative h-14 w-28 shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-900">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="112px"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-4 w-4 text-zinc-600 group-hover:text-zinc-500 transition-colors" />
          </div>
        )}
      </div>

      {/* 2. CORE TEXT AND DATA GRID CORE */}
      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center">
        
        {/* TITLES AND EXCERPT ALLOCATION BLOCK */}
        <div className="md:col-span-8 min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors duration-150 truncate">
            <Link href={`/ledger/${post.slug.current}`}>
              <span className="absolute inset-0 z-10" />
              {post.title}
            </Link>
          </h2>
          {post.excerpt && (
            <p className="text-xs text-zinc-500 line-clamp-1 leading-normal max-w-2xl group-hover:text-zinc-400 transition-colors duration-150">
              {post.excerpt}
            </p>
          )}
        </div>

        {/* REVENUE/MEDIA ALLOCATION CAPSULES */}
        <div className="md:col-span-2 hidden sm:flex items-center whitespace-nowrap">
          <span className={`inline-flex items-center justify-center w-[80px] py-0.5 text-[10px] font-bold font-mono rounded border tracking-wider text-center ${badge.utilities}`}>
            {badge.label}
          </span>
        </div>

        {/* DATE METADATA EDGE LOCK CONTAINER */}
        <div className="md:col-span-2 text-left md:text-right whitespace-nowrap">
          <span className="font-mono text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors duration-150">
            {post.publishedAt 
              ? new Date(post.publishedAt).toISOString().split('T')[0] 
              : '0000-00-00'
            }
          </span>
        </div>

      </div>

    </article>
  );
}