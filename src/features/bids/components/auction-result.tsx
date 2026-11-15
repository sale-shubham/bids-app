'use client';
import Link from 'next/link';
import { RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactCard } from '@/components/common/contact-card';
import { useAuthStore } from '@/store/auth-store';
import { formatINR } from '@/lib/utils';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import { RateSellerButton } from '@/features/reviews/components/rate-seller-button';
import { StarDisplay } from '@/features/reviews/components/star-rating';
import { SaleStatusBadge } from '@/features/sales/components/sale-status-badge';
import { BuyerSaleEntry } from '@/features/sales/components/buyer-sale-entry';

/** Outcome of an ended auction: sold / no bids, plus the winner's or seller's view of it. */
export function AuctionResult({ auction }: { auction: AuctionDetail }) {
  const member = useAuthStore((s) => s.member);
  const contact = auction.contact ?? null;
  const sale = auction.sale ?? null;

  if (auction.status === 'CANCELLED') {
    return <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">This auction was cancelled.</p>;
  }

  // A bid is not a sale: with a hidden reserve the auction can end with bids and no winner.
  const sold = !!auction.winnerId;
  const reserveNotMet = !sold && auction.bidCount > 0 && auction.hasReserve && !auction.reserveMet;
  const isWinner = !!member && (auction.winnerId === member.id || contact?.role === 'SELLER');
  const isSeller = !!member && (auction.seller.id === member.id || contact?.role === 'WINNER');

  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
      <div>
        <p className="text-sm text-muted-foreground">Result</p>
        <p className="text-xl font-bold">
          {sold ? `Sold for ${formatINR(auction.currentBidPaise)}` : reserveNotMet ? 'Reserve not met — not sold' : auction.bidCount > 0 ? 'Ended without a sale' : 'Ended with no bids'}
        </p>
      </div>

      {!sold && isSeller && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/sell/new?from=${auction.id}`}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Relist
          </Link>
        </Button>
      )}

      {sold && isWinner && (
        <>
          <p className="inline-flex items-center gap-2 text-base font-semibold text-success">
            <Trophy className="h-5 w-5" aria-hidden /> You won!
          </p>
          {sale ? (
            <BuyerSaleEntry saleId={sale.id} status={sale.status} payBy={sale.payBy} />
          ) : contact?.role === 'SELLER' ? (
            <>
              <p className="text-sm text-muted-foreground">Contact the seller to arrange payment and delivery.</p>
              <ContactCard title="Seller contact" contact={contact} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">The seller&apos;s contact details will appear here shortly.</p>
          )}
        </>
      )}

      {sold && isWinner && auction.canReview && !auction.review && (
        <RateSellerButton auctionId={auction.id} sellerName={auction.seller.name} />
      )}

      {sold && auction.review && (
        <div className="space-y-1.5 rounded-lg border bg-background p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{isWinner ? 'Your rating' : 'Buyer rating'}</p>
          <StarDisplay rating={auction.review.rating} />
          {auction.review.comment && <p className="whitespace-pre-line wrap-break-word">{auction.review.comment}</p>}
          {auction.review.sellerReply && (
            <p className="whitespace-pre-line wrap-break-word rounded-md bg-muted/60 p-2">
              <span className="block text-xs font-medium text-muted-foreground">Seller reply</span>
              {auction.review.sellerReply}
            </p>
          )}
        </div>
      )}

      {sold && isSeller && sale && (
        <div className="flex flex-wrap items-center gap-2">
          <SaleStatusBadge status={sale.status} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/sell/sales/${sale.id}`}>View sale</Link>
          </Button>
        </div>
      )}

      {sold && isSeller && !sale && (
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
