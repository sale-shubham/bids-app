'use client';
import Link from 'next/link';
import { Mail, Phone, Trophy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { formatINR } from '@/lib/utils';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import type { AuctionContact } from '../bids.types';

function ContactCard({ title, contact }: { title: string; contact: AuctionContact }) {
  return (
    <div className="space-y-2 rounded-lg border bg-background p-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="inline-flex items-center gap-2 font-medium">
        <User className="h-4 w-4 text-muted-foreground" aria-hidden /> {contact.name}
      </p>
      <p>
        <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 text-primary hover:underline">
          <Mail className="h-4 w-4" aria-hidden /> {contact.email}
        </a>
      </p>
      <p>
        <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 text-primary hover:underline">
          <Phone className="h-4 w-4" aria-hidden /> {contact.phone}
        </a>
      </p>
    </div>
  );
}

/** Outcome of an ended auction: sold / no bids, plus the winner's or seller's view of it. */
export function AuctionResult({ auction }: { auction: AuctionDetail }) {
  const member = useAuthStore((s) => s.member);
  const contact = auction.contact ?? null;

  if (auction.status === 'CANCELLED') {
    return <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">This auction was cancelled.</p>;
  }

  const sold = auction.bidCount > 0;
  const isWinner = !!member && (auction.winnerId === member.id || contact?.role === 'SELLER');
  const isSeller = !!member && (auction.seller.id === member.id || contact?.role === 'WINNER');

  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
      <div>
        <p className="text-sm text-muted-foreground">Result</p>
        <p className="text-xl font-bold">{sold ? `Sold for ${formatINR(auction.currentBidPaise)}` : 'Ended with no bids'}</p>
      </div>

      {sold && isWinner && (
        <>
          <p className="inline-flex items-center gap-2 text-base font-semibold text-success">
            <Trophy className="h-5 w-5" aria-hidden /> You won!
          </p>
          {contact?.role === 'SELLER' ? (
            <>
              <p className="text-sm text-muted-foreground">Contact the seller to arrange payment and delivery.</p>
              <ContactCard title="Seller contact" contact={contact} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">The seller&apos;s contact details will appear here shortly.</p>
          )}
        </>
      )}

      {sold && isSeller && (
        <>
          {contact?.role === 'WINNER' ? (
            <ContactCard title="Winner contact" contact={contact} />
          ) : (
            <p className="text-sm text-muted-foreground">The winner&apos;s contact details will appear here shortly.</p>
          )}
          <p className="text-sm text-muted-foreground">
            A commission is due on this sale.{' '}
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link href="/sell/commissions">View commissions</Link>
            </Button>
          </p>
        </>
      )}
    </div>
  );
}
