'use client';
import * as React from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Gavel, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Countdown, auctionPhase, useServerNow } from '@/components/common/countdown';
import { apiErrorCode } from '@/lib/api-client';
import { cn, formatINR } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import { DepositCard, DepositPaidChip, needsDeposit } from '@/features/deposits/components/deposit-card';
import { isStaleDepositError } from '@/features/deposits/deposits.errors';
import { bidErrorMessage, buyNowErrorMessage } from '../bids.errors';
import { basePricePaise, ceilRupees, minNextBidPaise, rupeesToPaise } from '../bids.utils';
import { useMaxPricePaise } from '@/features/settings/use-settings';
import { usePulseKey } from '@/features/live/use-pulse-key';
import { useBuyNow, usePlaceBid } from '../use-bids';
import { AuctionResult } from './auction-result';

const MULTIPLIERS = [1, 2, 5] as const;

/** Price summary + everything the viewer can do next (bid / log in / wait / see the result). */
export function BidPanel({ auction }: { auction: AuctionDetail }) {
  const member = useAuthStore((s) => s.member);
  const initialized = useAuthStore((s) => s.initialized);
  const now = useServerNow();
  const hasBids = auction.bidCount > 0;
  const priceKey = usePulseKey(auction.currentBidPaise);
  const closed = auction.status === 'ENDED' || auction.status === 'CANCELLED';
  const phase = auctionPhase(auction, now).phase;
  const pastEnd = !closed && now !== 0 && phase === 'ended';
  const notStarted = !closed && !pastEnd && (now === 0 ? auction.status === 'SCHEDULED' : phase === 'starts');
  const minNext = minNextBidPaise(auction);
  const isHighest = !!member && (auction.highestBidderId === member.id || auction.recentBids?.[0]?.isMe === true);

  let action: React.ReactNode;
  if (closed) action = <AuctionResult auction={auction} />;
  else if (pastEnd) action = <Note>This auction has ended. The final result will appear shortly.</Note>;
  else if (!initialized) action = <Skeleton className="h-10 w-full" />;
  else if (!member)
    action = (
      <Button asChild className="w-full">
        <Link href={`/login?next=${encodeURIComponent(`/auctions/${auction.id}`)}`}>Log in to bid</Link>
      </Button>
    );
  else if (member.id === auction.seller.id) action = <Note>This is your auction, so you cannot bid on it.</Note>;
  else if (member.role === 'SUPER_ADMIN') action = <Note>Admin accounts cannot place bids.</Note>;
  else if (notStarted)
    action = (
      <Note>
        Bidding opens when the auction starts. <Countdown startTime={auction.startTime} endTime={auction.endTime} status={auction.status} className="ml-1" />
      </Note>
    );
  else if (needsDeposit(auction)) action = <DepositCard auction={auction} />;
  else if (isHighest)
    action = (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            You&apos;re the highest bidder
            {typeof auction.myMaxBidPaise === 'number' && <> · your max {formatINR(auction.myMaxBidPaise)}</>}
          </span>
        </div>
        <BidControls auction={auction} minNext={minNext} raiseFrom={auction.myMaxBidPaise ?? basePricePaise(auction)} />
      </div>
    );
  else action = <BidControls auction={auction} minNext={minNext} />;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {hasBids ? 'Current bid' : 'Starting bid'}
              {auction.hasReserve && !closed && (
                <Badge variant={auction.reserveMet ? 'success' : 'warning'}>{auction.reserveMet ? 'Reserve met' : 'Reserve not met'}</Badge>
              )}
            </p>
            <p key={priceKey} className={cn('inline-block text-3xl font-extrabold text-primary', priceKey > 0 && 'animate-price-flash')}>
              {formatINR(basePricePaise(auction))}
            </p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Gavel className="h-4 w-4" aria-hidden />
            {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
          </p>
        </div>
        {!closed && (
          <p className="text-sm text-muted-foreground">
            Minimum next bid: <span className="font-semibold text-foreground">{formatINR(minNext)}</span>
            <span className="ml-1">(increment {formatINR(auction.minIncrementPaise)})</span>
          </p>
        )}
        {member && typeof auction.myHighestBidPaise === 'number' && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Your highest bid: <span className="font-semibold text-foreground">{formatINR(auction.myHighestBidPaise)}</span>
            {!closed && !isHighest && <Badge variant="warning">Outbid</Badge>}
          </p>
        )}
        {member && !closed && <DepositPaidChip auction={auction} />}
        {action}
      </CardContent>
    </Card>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">{children}</p>;
}

/**
 * Max-bid form. `raiseFrom` set = the viewer already leads: the input must exceed that current
 * maximum (same submit hook, no quick buttons, no Buy It Now).
 */
function BidControls({ auction, minNext, raiseFrom }: { auction: AuctionDetail; minNext: number; raiseFrom?: number }) {
  const qc = useQueryClient();
  const place = usePlaceBid(auction.id);
  const maxPricePaise = useMaxPricePaise();
  const raising = raiseFrom !== undefined;
  const [custom, setCustom] = React.useState('');
  const [customError, setCustomError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<number | null>(null);

  const base = basePricePaise(auction);
  const quick = MULTIPLIERS.map((k) => ({ k, paise: base + k * auction.minIncrementPaise }));

  const refetchAuction = () => void qc.invalidateQueries({ queryKey: ['auction', auction.id] });

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(custom);
    if (paise === null) return setCustomError('Enter a whole rupee amount.');
    if (raising && paise <= raiseFrom) return setCustomError(`Enter more than your current max of ${formatINR(raiseFrom)}.`);
    if (!raising && paise < minNext) return setCustomError(`Bid at least ${formatINR(minNext)}.`);
    if (paise > maxPricePaise) return setCustomError(`Bid can be at most ${formatINR(maxPricePaise)}.`);
    setCustomError(null);
    setPending(paise);
  };

  const confirm = () => {
    if (pending === null) return;
    const amount = pending;
    place.mutate(amount, {
      onSuccess: (data) => {
        // Outbid by a higher proxy max: keep the form open (and the typed value) to try again.
        if (!data?.outbidByProxy) setCustom('');
        setPending(null);
      },
      onError: (e) => {
        toast.error(bidErrorMessage(e));
        const code = apiErrorCode(e);
        if (code === 'BID_TOO_LOW' || code === 'MAX_TOO_LOW' || code === 'AUCTION_ENDED' || code === 'ALREADY_HIGHEST' || code === 'AUCTION_NOT_STARTED' || isStaleDepositError(e)) refetchAuction();
        setPending(null);
      },
    });
  };

  const inputId = raising ? 'raise-max' : 'bid-amount';
  const firstRupees = raising ? Math.floor(raiseFrom / 100) + 1 : ceilRupees(minNext);

  return (
    <div className="space-y-3">
      {!raising && (
        <div className="grid grid-cols-3 gap-2">
          {quick.map(({ k, paise }) => (
            <Button key={k} type="button" variant="outline" className="h-auto flex-col gap-0.5 py-2" disabled={place.isPending} onClick={() => setPending(paise)}>
              <span className="text-xs text-muted-foreground">+{k}×</span>
              <span className="font-semibold">{formatINR(paise)}</span>
            </Button>
          ))}
        </div>
      )}
      <form onSubmit={submitCustom} className="space-y-1.5" noValidate>
        <label htmlFor={inputId} className="text-sm font-medium">
          {raising ? 'Raise your max (₹)' : 'Your maximum bid (₹)'}
        </label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(firstRupees)}
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setCustomError(null);
            }}
            aria-invalid={!!customError}
            aria-describedby={`${inputId}-help${customError ? ` ${inputId}-error` : ''}`}
            disabled={place.isPending}
          />
          <Button type="submit" disabled={place.isPending || custom.trim() === ''}>
            {raising ? 'Raise max' : 'Place bid'}
          </Button>
        </div>
        <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
          We bid for you, only as much as needed to keep you in the lead.
        </p>
        {customError && (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">
            {customError}
          </p>
        )}
      </form>

      {!raising && auction.buyNowPricePaise !== null && <BuyNow auction={auction} buyNowPaise={auction.buyNowPricePaise} />}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && !place.isPending && setPending(null)}
        title={raising ? 'Confirm your new maximum' : 'Confirm your maximum bid'}
        description={
          pending !== null
            ? `Your maximum is ${formatINR(pending)} on "${auction.title}". We bid for you only as much as needed, up to this amount. Bids cannot be withdrawn.`
            : undefined
        }
        confirmLabel={pending !== null ? `Set max ${formatINR(pending)}` : 'Place bid'}
        loading={place.isPending}
        onConfirm={confirm}
      />
    </div>
  );
}

/** "Buy now for ₹X": ends the auction immediately for the buyer. */
function BuyNow({ auction, buyNowPaise }: { auction: AuctionDetail; buyNowPaise: number }) {
  const qc = useQueryClient();
  const buy = useBuyNow(auction.id);
  const [open, setOpen] = React.useState(false);

  const confirm = () =>
    buy.mutate(undefined, {
      onSuccess: () => setOpen(false),
      onError: (e) => {
        toast.error(buyNowErrorMessage(e));
        const code = apiErrorCode(e);
        if (code === 'BUY_NOW_UNAVAILABLE' || code === 'AUCTION_ENDED' || isStaleDepositError(e)) void qc.invalidateQueries({ queryKey: ['auction', auction.id] });
        setOpen(false);
      },
    });

  return (
    <>
      <Button type="button" variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <ShoppingCart className="h-4 w-4" aria-hidden /> Buy now for {formatINR(buyNowPaise)}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => !o && !buy.isPending && setOpen(false)}
        title="Buy it now"
        description={`You agree to buy this item for ${formatINR(buyNowPaise)}. The auction ends immediately.`}
        confirmLabel={`Buy for ${formatINR(buyNowPaise)}`}
        loading={buy.isPending}
        onConfirm={confirm}
      />
    </>
  );
}
