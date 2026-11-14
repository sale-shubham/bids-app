import Link from 'next/link';
import type { Metadata } from 'next';
import { Gavel, PackagePlus, Search, Trophy } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { TopBidders } from '@/features/leaderboard/components/leaderboard-view';
import { getLeaderboardServer } from '@/features/leaderboard/leaderboard.server';
import { Button } from '@/components/ui/button';
import { AuctionGrid } from '@/features/auctions/components/auction-grid';
import { RecentlyViewed } from '@/features/auctions/components/recently-viewed';
import { ServerTimeSync } from '@/features/auctions/components/server-time-sync';
import { getHomeServer } from '@/features/auctions/auctions.server';
import type { AuctionCard, HomeAuctions } from '@/features/auctions/auctions.types';

export const metadata: Metadata = {
  title: 'NobleBid — Online Auctions',
  description: 'Bid on live auctions, find ending-soon deals and sell your own items on NobleBid.',
  alternates: { canonical: '/' },
};

// Revalidated every 30 s via the fetch in getHomeServer().
export default async function HomePage() {
  let home: HomeAuctions | null = null;
  try {
    home = await getHomeServer();
  } catch {
    home = null;
  }

  const topBidders = (await getLeaderboardServer('spent', 5)) ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <ServerTimeSync serverTime={home?.serverTime} />
      <main className="flex-1">
        <section className="border-b bg-muted/40">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-14 text-center sm:px-6 sm:py-20">
            <h1 className="text-gradient text-4xl font-extrabold tracking-tight sm:text-5xl">Bid. Win. Sell.</h1>
            <p className="max-w-xl text-muted-foreground">
              India&apos;s auction marketplace — find one-of-a-kind items, bid in real time, or list your own and let the market set the price.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/auctions">Browse auctions</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sell/new">Start selling</Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
          {home ? (
            <>
              <Section title="Featured" href="/auctions" items={home.featured} />
              <Section title="Ending soon" href="/auctions?sort=endingSoon" items={home.endingSoon} />
              <Section title="Upcoming" href="/auctions?status=upcoming" items={home.upcoming} />
            </>
          ) : (
            <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              Auctions could not be loaded right now.{' '}
              <Link href="/auctions" className="font-medium text-primary hover:underline">
                Browse all auctions
              </Link>
            </p>
          )}

          <TopBidders entries={topBidders} />

          <RecentlyViewed />

          <section aria-labelledby="how-it-works" className="space-y-4">
            <h2 id="how-it-works" className="text-xl font-bold tracking-tight">
              How it works
            </h2>
            <ol className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Search, title: 'Find an item', text: 'Browse live and upcoming auctions or search by category.' },
                { icon: Gavel, title: 'Place your bid', text: 'Bid in real time and watch the countdown.' },
                { icon: Trophy, title: 'Win it', text: 'Highest bid when the clock runs out wins the item.' },
              ].map((s, i) => (
                <li key={s.title} className="flex gap-3 rounded-xl border p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {i + 1}. {s.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <PackagePlus className="h-4 w-4" aria-hidden /> Have something to sell?{' '}
              <Link href="/sell/new" className="font-medium text-primary hover:underline">
                Create an auction
              </Link>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, href, items }: { title: string; href: string; items: AuctionCard[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4" aria-label={title}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <Link href={href} className="text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      </div>
      <AuctionGrid auctions={items} />
    </section>
  );
}
