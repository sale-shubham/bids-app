'use client';
import * as React from 'react';
import { formatDistanceStrict } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useServerNow } from '@/components/common/countdown';
import { cn, formatINR } from '@/lib/utils';
import type { BidDTO } from '../bids.types';
import { useAuctionBids } from '../use-bids';

function BidRow({ bid, highest, now, fresh }: { bid: BidDTO; highest: boolean; now: number; fresh: boolean }) {
  return (
    <li className={cn('flex items-center justify-between gap-3 py-2 text-sm', fresh && 'animate-row-in')}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium">{bid.isMe ? 'You' : bid.bidderLabel}</span>
        {bid.isMe && <Badge variant="default">You</Badge>}
        {highest && <Badge variant="success">Highest</Badge>}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums">{formatINR(bid.amountPaise)}</p>
        <p className="text-xs text-muted-foreground">
          {now === 0 ? ' ' : formatDistanceStrict(Date.parse(bid.createdAt), now, { addSuffix: true })}
        </p>
      </div>
    </li>
  );
}

/**
 * Bid history, newest first. Starts from the detail's `recentBids` (no extra request);
 * "Show all bids" switches to the paginated `GET /auctions/:id/bids`. With `alwaysFull`
 * (the seller page) the full list loads straight away.
 */
export function BidHistory({
  auctionId,
  recentBids,
  bidCount,
  alwaysFull = false,
}: {
  auctionId: string;
  recentBids: BidDTO[];
  bidCount: number;
  alwaysFull?: boolean;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const full = alwaysFull || showAll;
  const history = useAuctionBids(auctionId, full);
  const now = useServerNow();

  const fullItems = history.data?.pages.flatMap((p) => p.items);
  const items = full && fullItems ? fullItems : recentBids;
  // Rows that appeared at the top since the last render fade in (rows loaded at the bottom by
  // "Load more" do not).
  const ids = items.map((b) => b.id);
  const [known, setKnown] = React.useState(() => new Set(ids));
  let lead = 0;
  while (lead < ids.length && !known.has(ids[lead])) lead++;
  const fresh = lead < ids.length ? lead : 0;
  if (ids.some((id) => !known.has(id))) setKnown(new Set([...known, ...ids]));
  const canExpand = !full && bidCount > recentBids.length;

  return (
    <section className="space-y-2" aria-labelledby="bid-history">
      <h2 id="bid-history" className="text-lg font-semibold">
        Bid history
      </h2>
      {full && history.isPending ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading bids…
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bids yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border px-3">
          {items.map((b, i) => (
            <BidRow key={b.id} bid={b} highest={i === 0} now={now} fresh={i < fresh} />
          ))}
        </ul>
      )}
      {full && history.isError && (
        <Button variant="outline" size="sm" onClick={() => void history.refetch()}>
          Could not load bids. Try again
        </Button>
      )}
      {canExpand && (
        <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
          Show all bids ({bidCount})
        </Button>
      )}
      {full && history.hasNextPage && (
        <Button variant="outline" size="sm" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
          {history.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </section>
  );
}
