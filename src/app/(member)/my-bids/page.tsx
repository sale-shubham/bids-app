'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { AlertCircle, Gavel, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Countdown } from '@/components/common/countdown';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { apiErrorMessage } from '@/lib/api-client';
import { StatusTabs } from '@/features/admin/components/admin-list';
import { useUrlState } from '@/features/admin/use-url-state';
import { formatINR } from '@/lib/utils';
import { CoverImage } from '@/features/auctions/components/auction-card';
import type { MyBidRow, MyBidState, MyBidsTab } from '@/features/bids/bids.types';
import { useMyBids } from '@/features/bids/use-bids';
import { RateSellerButton } from '@/features/reviews/components/rate-seller-button';
import { StrikeBanner } from '@/features/strikes/components/strike-banner';
import { BuyerSaleEntry } from '@/features/sales/components/buyer-sale-entry';

const TABS: { value: MyBidsTab; label: string }[] = [
  { value: 'winning', label: 'Winning' },
  { value: 'outbid', label: 'Outbid' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const DEFAULTS = { tab: 'winning' };

const EMPTY: Record<MyBidsTab, { title: string; description: string }> = {
  winning: { title: 'Not winning anything yet', description: 'Auctions where you are the highest bidder show up here.' },
  outbid: { title: 'You have not been outbid', description: 'Auctions where someone has topped your bid show up here.' },
  won: { title: 'No wins yet', description: 'Auctions you won will be listed here with the seller contact.' },
  lost: { title: 'Nothing lost', description: 'Ended auctions you did not win show up here.' },
};

const STATE: Record<MyBidState, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  WINNING: { label: 'Winning', variant: 'success' },
  OUTBID: { label: 'Outbid', variant: 'warning' },
  WON: { label: 'Won', variant: 'success' },
  LOST: { label: 'Lost', variant: 'secondary' },
};

function MyBidCard({ row }: { row: MyBidRow }) {
  const { auction: a } = row;
  const s = STATE[row.state];
  return (
    <li className="flex flex-col gap-3 rounded-xl border p-3 @lg/content:flex-row @lg/content:items-center">
      <Link href={`/auctions/${a.id}`} className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-muted @lg/content:w-32">
        <CoverImage src={a.coverImage} alt={a.title} sizes="128px" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={s.variant} dot>
            {s.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{a.category}</span>
        </div>
        <Link href={`/auctions/${a.id}`} className="block truncate font-semibold hover:underline">
          {a.title}
        </Link>
        <p className="text-sm text-muted-foreground">
          Your highest bid <span className="font-semibold text-foreground">{formatINR(row.myHighestBidPaise)}</span> · Current{' '}
          {formatINR(a.bidCount > 0 ? a.currentBidPaise : a.startingBidPaise)}
          {typeof row.myMaxBidPaise === 'number' && (
            <>
              {' '}
              · your max <span className="font-semibold text-foreground">{formatINR(row.myMaxBidPaise)}</span>
            </>
          )}{' '}
          · {row.myBidCount} of your {row.myBidCount === 1 ? 'bid' : 'bids'}
        </p>
        <Countdown startTime={a.startTime} endTime={a.endTime} status={a.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        {row.state === 'OUTBID' && a.status === 'LIVE' && (
          <Button asChild size="sm">
            <Link href={`/auctions/${a.id}`}>
              <Gavel className="h-4 w-4" /> Bid again
            </Link>
          </Button>
        )}
        {row.state === 'WON' && row.canReview && <RateSellerButton auctionId={a.id} sellerName={a.seller.name} />}
        {row.state === 'WON' && row.saleId && row.saleStatus && <BuyerSaleEntry saleId={row.saleId} status={row.saleStatus} />}
        <Button asChild variant="outline" size="sm">
          <Link href={`/auctions/${a.id}`}>{row.state === 'WON' && !row.saleId ? 'Seller contact' : 'View'}</Link>
        </Button>
      </div>
    </li>
  );
}

function MyBidsView() {
  const { values, update } = useUrlState(DEFAULTS);
  const tab: MyBidsTab = TABS.find((t) => t.value === values.tab)?.value ?? 'winning';
  const list = useMyBids(tab);
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="My bids" />
      <StrikeBanner />
      <ListToolbar tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ tab: v })} />} />

      {list.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <EmptyState
          icon={AlertCircle}
          title="Could not load your bids"
          description={apiErrorMessage(list.error, 'Please try again.')}
          actionLabel="Try again"
          onAction={() => void list.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={Trophy} title={EMPTY[tab].title} description={EMPTY[tab].description} actionLabel="Browse auctions" actionHref="/auctions" />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <MyBidCard key={r.auction.id} row={r} />
          ))}
        </ul>
      )}

      <InfiniteScroll onLoadMore={() => void list.fetchNextPage()} hasMore={!!list.hasNextPage && !list.isFetchNextPageError} loading={list.isFetchingNextPage} />
    </div>
  );
}

export default function MyBidsPage() {
  return (
    <Suspense>
      <MyBidsView />
    </Suspense>
  );
}
