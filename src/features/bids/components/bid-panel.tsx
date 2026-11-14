'use client';
import * as React from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Countdown, auctionPhase, useServerNow } from '@/components/common/countdown';
import { apiErrorCode } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import { bidErrorMessage } from '../bids.errors';
import { basePricePaise, ceilRupees, minNextBidPaise, rupeesToPaise } from '../bids.utils';
import { usePlaceBid } from '../use-bids';
import { AuctionResult } from './auction-result';

const MULTIPLIERS = [1, 2, 5] as const;

/** Price summary + everything the viewer can do next (bid / log in / wait / see the result). */
export function BidPanel({ auction }: { auction: AuctionDetail }) {
  const member = useAuthStore((s) => s.member);
  const initialized = useAuthStore((s) => s.initialized);
  const now = useServerNow();
  const hasBids = auction.bidCount > 0;
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
  else if (member.role !== 'BIDDER') action = <Note>Only bidder accounts can bid.</Note>;
  else if (notStarted)
    action = (
      <Note>
        Bidding opens when the auction starts. <Countdown startTime={auction.startTime} endTime={auction.endTime} status={auction.status} className="ml-1" />
      </Note>
    );
  else if (isHighest)
    action = (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm font-semibold text-success">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> You&apos;re the highest bidder
      </div>
    );
  else action = <BidControls auction={auction} minNext={minNext} />;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{hasBids ? 'Current bid' : 'Starting bid'}</p>
            <p className="text-3xl font-extrabold text-primary">{formatINR(basePricePaise(auction))}</p>
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
        {action}
      </CardContent>
    </Card>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">{children}</p>;
}

function BidControls({ auction, minNext }: { auction: AuctionDetail; minNext: number }) {
  const qc = useQueryClient();
  const place = usePlaceBid(auction.id);
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
    if (paise < minNext) return setCustomError(`Bid at least ${formatINR(minNext)}.`);
    setCustomError(null);
    setPending(paise);
  };

  const confirm = () => {
    if (pending === null) return;
    const amount = pending;
    place.mutate(amount, {
      onSuccess: () => {
        toast.success(`Bid of ${formatINR(amount)} placed`);
        setCustom('');
        setPending(null);
      },
      onError: (e) => {
        toast.error(bidErrorMessage(e));
        const code = apiErrorCode(e);
        if (code === 'BID_TOO_LOW' || code === 'AUCTION_ENDED' || code === 'ALREADY_HIGHEST' || code === 'AUCTION_NOT_STARTED') refetchAuction();
        setPending(null);
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {quick.map(({ k, paise }) => (
          <Button key={k} type="button" variant="outline" className="h-auto flex-col gap-0.5 py-2" disabled={place.isPending} onClick={() => setPending(paise)}>
            <span className="text-xs text-muted-foreground">+{k}×</span>
            <span className="font-semibold">{formatINR(paise)}</span>
          </Button>
        ))}
      </div>
      <form onSubmit={submitCustom} className="space-y-1.5" noValidate>
        <label htmlFor="bid-amount" className="text-sm font-medium">
          Your bid (₹)
        </label>
        <div className="flex gap-2">
          <Input
            id="bid-amount"
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(ceilRupees(minNext))}
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setCustomError(null);
            }}
            aria-invalid={!!customError}
            aria-describedby={customError ? 'bid-amount-error' : undefined}
            disabled={place.isPending}
          />
          <Button type="submit" disabled={place.isPending || custom.trim() === ''}>
            Place bid
          </Button>
        </div>
        {customError && (
          <p id="bid-amount-error" role="alert" className="text-sm text-destructive">
            {customError}
          </p>
        )}
      </form>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && !place.isPending && setPending(null)}
        title="Confirm your bid"
        description={pending !== null ? `You are about to bid ${formatINR(pending)} on "${auction.title}". Bids cannot be withdrawn.` : undefined}
        confirmLabel={pending !== null ? `Bid ${formatINR(pending)}` : 'Place bid'}
        loading={place.isPending}
        onConfirm={confirm}
      />
    </div>
  );
}
