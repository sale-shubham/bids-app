'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { Eye, Gavel, Phone, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Countdown } from '@/components/common/countdown';
import { ListToolbar } from '@/components/common/list-toolbar';
import { PagedList } from '@/components/common/paged-list';
import { PageHeader } from '@/components/common/page-header';
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu';
import { StatusTabs } from '@/components/common/status-tabs';
import { useUrlState } from '@/features/admin/use-url-state';
import { formatINR } from '@/lib/utils';
import { CoverImage } from '@/features/auctions/components/auction-card';
import type { MyBidRow, MyBidState, MyBidsTab } from '@/features/bids/bids.types';
import { useMyBids } from '@/features/bids/use-bids';
import { RateSellerButton } from '@/features/reviews/components/rate-seller-button';
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

function StateBadge({ state }: { state: MyBidState }) {
  const s = STATE[state];
  return (
    <Badge variant={s.variant} dot>
      {s.label}
    </Badge>
  );
}

const currentPrice = (r: MyBidRow) => formatINR(r.auction.bidCount > 0 ? r.auction.currentBidPaise : r.auction.startingBidPaise);

const menu = (r: MyBidRow) => {
  const a = r.auction;
  const list: RowAction[] = [{ label: 'View', icon: Eye, href: `/auctions/${a.id}` }];
  if (r.state === 'OUTBID' && a.status === 'LIVE') list.push({ label: 'Bid again', icon: Gavel, href: `/auctions/${a.id}` });
  if (r.state === 'WON' && !r.saleId) list.push({ label: 'Seller contact', icon: Phone, href: `/auctions/${a.id}` });
  return <RowActionsMenu name={a.title} actions={list} />;
};

/** Rate-the-seller owns a dialog and the sale entry is a pay / status control, so they stay inline beside the menu. */
const inline = (r: MyBidRow) =>
  r.state === 'WON' && (r.canReview || (r.saleId && r.saleStatus)) ? (
    <>
      {r.canReview && <RateSellerButton auctionId={r.auction.id} sellerName={r.auction.seller.name} />}
      {r.saleId && r.saleStatus && <BuyerSaleEntry saleId={r.saleId} status={r.saleStatus} />}
    </>
  ) : null;

function MyBidsView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const tab: MyBidsTab = TABS.find((t) => t.value === values.tab)?.value ?? 'winning';
  const list = useMyBids(tab, page, pageSize);

  return (
    <div className="space-y-4">
      <PageHeader title="My bids" />
      <ListToolbar tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ tab: v })} />} />

      <PagedList<MyBidRow>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(r) => r.auction.id}
        errorTitle="Could not load your bids"
        empty={{ icon: Trophy, title: EMPTY[tab].title, description: EMPTY[tab].description, actionLabel: 'Browse auctions', actionHref: '/auctions' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auction</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Your highest / max</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Bids</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.auction.id}>
                  <TableCell className="max-w-64">
                    <Link href={`/auctions/${r.auction.id}`} className="flex items-center gap-3 hover:underline">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        <CoverImage src={r.auction.coverImage} alt={r.auction.title} sizes="48px" />
                      </div>
                      <span className="line-clamp-2 font-medium">{r.auction.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StateBadge state={r.state} />
                  </TableCell>
                  <TableCell className="text-right tnum">
                    {formatINR(r.myHighestBidPaise)}
                    {typeof r.myMaxBidPaise === 'number' && <span className="block text-xs text-muted-foreground">max {formatINR(r.myMaxBidPaise)}</span>}
                  </TableCell>
                  <TableCell className="text-right tnum">{currentPrice(r)}</TableCell>
                  <TableCell className="text-right tnum">{r.myBidCount}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Countdown startTime={r.auction.startTime} endTime={r.auction.endTime} status={r.auction.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {inline(r)}
                      {menu(r)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(r) => (
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-3">
                <Link href={`/auctions/${r.auction.id}`} className="flex min-w-0 grow items-center gap-3 hover:underline">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    <CoverImage src={r.auction.coverImage} alt={r.auction.title} sizes="56px" />
                  </div>
                  <span className="min-w-0 font-medium wrap-break-word">{r.auction.title}</span>
                </Link>
                {menu(r)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StateBadge state={r.state} />
                <span className="text-xs text-muted-foreground">{r.auction.category}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your highest bid <span className="font-semibold text-foreground tnum">{formatINR(r.myHighestBidPaise)}</span> · Current{' '}
                <span className="tnum">{currentPrice(r)}</span>
                {typeof r.myMaxBidPaise === 'number' && (
                  <>
                    {' '}
                    · your max <span className="font-semibold text-foreground tnum">{formatINR(r.myMaxBidPaise)}</span>
                  </>
                )}{' '}
                · {r.myBidCount} of your {r.myBidCount === 1 ? 'bid' : 'bids'}
              </p>
              <Countdown startTime={r.auction.startTime} endTime={r.auction.endTime} status={r.auction.status} />
              {inline(r) && <div className="flex flex-wrap gap-2">{inline(r)}</div>}
            </CardContent>
          </Card>
        )}
      />
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
