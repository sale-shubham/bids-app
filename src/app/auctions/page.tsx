import type { Metadata } from 'next';
import { Gavel } from 'lucide-react';
import { ComingSoon } from '@/components/common/coming-soon';
import { PublicHeader } from '@/components/layout/public-header';

export const metadata: Metadata = { title: 'Auctions — NobleBid' };

// Public (no login needed). Real browse/search lands in Phase 2.
export default function AuctionsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <ComingSoon
          icon={Gavel}
          title="Auctions"
          phase={2}
          description="Browse live, upcoming and ended auctions here."
        />
      </main>
    </div>
  );
}
