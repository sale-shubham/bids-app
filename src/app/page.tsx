import Link from 'next/link';
import { PublicHeader } from '@/components/layout/public-header';

// Placeholder — the real Home (live auctions, ending soon, how it works) arrives in Phase 2.
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-gradient text-4xl font-extrabold tracking-tight">NobleBid</h1>
        <p className="text-muted-foreground">Online auctions, bid by bid. Coming soon.</p>
        <Link href="/auctions" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Browse auctions
        </Link>
      </main>
    </div>
  );
}
