import Link from 'next/link';
import type { Metadata } from 'next';
import { BadgeCheck, Gavel, Lock, Timer, Users } from 'lucide-react';
import { PublicPage } from '@/components/layout/public-page';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About NobleBid',
  description: 'NobleBid is an online auction marketplace where anyone can bid in real time or sell items to the highest bidder, fairly and transparently.',
  alternates: { canonical: '/about' },
};

const TRUST = [
  { icon: Timer, title: 'Fair endings', text: 'Anti-sniping extends the clock when a bid lands in the final minutes, so the best offer wins, not the fastest finger.' },
  { icon: Lock, title: 'Secure by design', text: 'Verified email accounts, protected sessions and payments handled by a trusted gateway.' },
  { icon: BadgeCheck, title: 'Transparent fees', text: 'Bidding is free. Sellers pay a small commission only when an item sells, and you can see the exact rate.' },
  { icon: Users, title: 'Real people', text: 'Every seller has a public profile with their history, so you know who you are dealing with.' },
];

export default function AboutPage() {
  return (
    <PublicPage className="max-w-4xl space-y-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          About <span className="text-gradient">NobleBid</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          NobleBid is an online auction marketplace built for India. Find one-of-a-kind items, bid in real time and win them at a price the market decides.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">What we do</h2>
        <p className="text-muted-foreground">
          Traditional auctions needed a room, a gavel and a lot of luck with timing. NobleBid puts the whole thing online: sellers list an item with photos, a
          starting bid and a schedule; bidders compete live while a countdown ticks; and when the clock runs out the highest bid wins. Everything, from
          notifications to the bid history, updates in real time.
        </p>
        <p className="text-muted-foreground">
          We are a marketplace, not a shop. We never hold stock; we provide the stage, the rules and the tools so buyers and sellers can deal with each other directly.
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="trust">
        <h2 id="trust" className="text-xl font-bold">
          Why people trust NobleBid
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {TRUST.map((t) => (
            <li key={t.title} className="flex gap-3 rounded-xl border p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <t.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">{t.title}</p>
                <p className="text-sm text-muted-foreground">{t.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start gap-4 rounded-xl border bg-muted/30 p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Gavel className="h-5 w-5 text-primary" aria-hidden /> Ready to start?
        </h2>
        <p className="text-muted-foreground">Browse what is live right now, or read how bidding and selling work.</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/auctions">Browse auctions</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/how-it-works">How it works</Link>
          </Button>
        </div>
      </section>
    </PublicPage>
  );
}
