import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronDown } from 'lucide-react';
import { PublicPage } from '@/components/layout/public-page';
import { Button } from '@/components/ui/button';
import { formatBps, getPublicSettingsServer } from '@/features/settings/settings.server';

export const metadata: Metadata = {
  title: 'How NobleBid works',
  description: 'How to bid, how to sell, what it costs and how anti-sniping keeps auctions fair on NobleBid.',
  alternates: { canonical: '/how-it-works' },
};

const BIDDER_STEPS = [
  ['Create a free account', 'Sign up with your email and verify it with a one-time code.'],
  ['Find something you want', 'Browse live and upcoming auctions, filter by category, condition and price, and add favourites to your watchlist.'],
  ['Place your bid', 'Bid at least the minimum increment above the current price. You will see the bid history and countdown update live.'],
  ['Win and connect', 'When the clock ends, the highest bidder wins. You and the seller then get each other’s contact details to arrange payment and delivery.'],
];

const SELLER_STEPS = [
  ['Create a listing', 'Add a title, photos, description, category, condition, starting bid and the schedule.'],
  ['Go live', 'Your auction opens at the start time and bidders compete until it ends.'],
  ['Pay the commission', 'When an item sells, a small commission on the final price is due. Settle it from your dashboard to keep listing.'],
  ['Deliver', 'Contact the winner, agree payment and ship the item.'],
];

const FAQ = [
  ['Is it free to bid?', 'Yes. Creating an account and bidding cost nothing.'],
  ['Can I cancel a bid?', 'No. A bid is a commitment, so bid only what you are happy to pay.'],
  ['What is a watchlist?', 'Tap the heart on any auction to save it. You will get an email or push notification one hour before a watched auction ends.'],
  ['Who handles payment and delivery for the item?', 'The winner and the seller arrange it directly using the contact details NobleBid shares after the auction ends.'],
  ['Can a seller edit a listing?', 'Only until the first bid is placed. After that, the listing is locked so bidders can trust what they bid on.'],
  ['What if I have a problem?', 'Use the contact page and our team will get back to you.'],
];

function Steps({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <section className="space-y-4" aria-label={title}>
      <h2 className="text-xl font-bold">{title}</h2>
      <ol className="space-y-3">
        {steps.map(([head, text], i) => (
          <li key={head} className="flex gap-3 rounded-xl border p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
            <div>
              <p className="font-semibold">{head}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function HowItWorksPage() {
  const settings = await getPublicSettingsServer();
  const commission = settings ? formatBps(settings.commissionRateBps) : null;
  const snipe = settings?.antiSnipingMinutes;

  return (
    <PublicPage className="max-w-4xl space-y-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How NobleBid works</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">Whether you want to win something special or sell something you no longer need, it takes a few simple steps.</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <Steps title="If you are bidding" steps={BIDDER_STEPS} />
        <Steps title="If you are selling" steps={SELLER_STEPS} />
      </div>

      <section className="space-y-4" aria-labelledby="fees">
        <h2 id="fees" className="text-xl font-bold">
          Fees
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Bidders</p>
            <p className="text-2xl font-bold text-primary">Free</p>
            <p className="text-sm text-muted-foreground">No fee to join, browse or bid.</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Sellers</p>
            <p className="text-2xl font-bold text-primary">{commission ? `${commission} commission` : 'Small commission'}</p>
            <p className="text-sm text-muted-foreground">Charged on the final price, only when your item sells.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="anti-sniping">
        <h2 id="anti-sniping" className="text-xl font-bold">
          Anti-sniping: fair endings
        </h2>
        <p className="text-muted-foreground">
          Sniping is placing a bid in the last second so nobody can respond.{' '}
          {snipe
            ? `On NobleBid, if a bid arrives in the final ${snipe} ${snipe === 1 ? 'minute' : 'minutes'}, the auction is extended so everyone gets a chance to answer.`
            : 'On NobleBid, if a bid arrives in the final minutes, the auction is extended so everyone gets a chance to answer.'}{' '}
          The auction only ends once a full quiet period passes with no new bids.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="faq">
        <h2 id="faq" className="text-xl font-bold">
          Frequently asked questions
        </h2>
        <div className="divide-y rounded-xl border">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
                {q}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/auctions">Browse auctions</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sell/new">Start selling</Link>
        </Button>
      </div>
    </PublicPage>
  );
}
