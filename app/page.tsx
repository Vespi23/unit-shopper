import { Suspense } from 'react';
import { SearchPage } from '@/components/SearchPage';
import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  props: Props
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const query = searchParams.q;

  if (query && typeof query === 'string') {
    const decoded = decodeURIComponent(query);
    return {
      title: `${decoded} Unit Price & Deals - BudgetLynx`,
      description: `Find the best unit price for ${decoded}. We compare sizes to find the true best deal on Amazon.`,
      openGraph: {
        images: [`/api/og?title=${encodeURIComponent(decoded)}`],
      },
    };
  }

  return {
    title: 'BudgetLynx - See What Others Miss. Shop by Unit Price.',
    description: 'Stop overpaying on Amazon. Compare true unit prices (per oz, count, lb) instantly to find the best bulk deals and savings.',
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SearchPage initialResults={[]} />
    </Suspense>
  );
}