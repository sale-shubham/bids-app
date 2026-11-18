'use client';
import Link from 'next/link';
import { Eye, Heart, HeartOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Countdown } from '@/components/common/countdown';
import { PagedList } from '@/components/common/paged-list';
import { RowActionsMenu } from '@/components/common/row-actions-menu';
import { useUrlState } from '@/features/admin/use-url-state';
import { AuctionStatusBadge, CoverImage } from '@/features/auctions/components/auction-card';
import { formatINR } from '@/lib/utils';
import type { WatchlistEntry } from '../watchlist.api';
import { useToggleWatch, useWatchlist } from '../use-watchlist';

const price = (e: WatchlistEntry) => formatINR(e.auction.bidCount > 0 ? e.auction.currentBidPaise : e.auction.startingBidPaise);

export function WatchlistView() {
  const { page, pageSize, update } = useUrlState({});
  const list = useWatchlist(page, pageSize);
  const toggle = useToggleWatch();

  const actions = (e: WatchlistEntry) => (
    <RowActionsMenu
      name={e.auction.title}
      actions={[
        { label: 'View', icon: Eye, href: `/auctions/${e.auction.id}` },
        { label: 'Remove from watchlist', icon: HeartOff, onSelect: () => toggle.mutate({ auctionId: e.auction.id, watching: false }) },
      ]}
    />
  );

  return (
    <PagedList<WatchlistEntry>
      list={list}
      page={page}
      onPageChange={(p) => update({ page: String(p) })}
      onPageSizeChange={(s) => update({ pageSize: String(s) })}
      getKey={(e) => e.auction.id}
      errorTitle="Could not load your watchlist"
      empty={{
        icon: Heart,
        title: 'Nothing on your watchlist yet',
        description: 'Tap the heart on any auction to save it here. We will email you an hour before it ends.',
        actionLabel: 'Browse auctions',
        actionHref: '/auctions',
      }}
      renderTable={(items) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Auction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Current price</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.auction.id}>
                <TableCell className="max-w-72">
                  <Link href={`/auctions/${e.auction.id}`} className="flex items-center gap-3 hover:underline">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      <CoverImage src={e.auction.coverImage} alt={e.auction.title} sizes="48px" />
                    </div>
                    <span className="line-clamp-2 font-medium">{e.auction.title}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <AuctionStatusBadge status={e.auction.status} />
                </TableCell>
                <TableCell className="text-right tnum">{price(e)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Countdown startTime={e.auction.startTime} endTime={e.auction.endTime} status={e.auction.status} />
                </TableCell>
                <TableCell className="text-right">{actions(e)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      renderCard={(e) => (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-3">
              <Link href={`/auctions/${e.auction.id}`} className="flex min-w-0 grow items-center gap-3 hover:underline">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <CoverImage src={e.auction.coverImage} alt={e.auction.title} sizes="56px" />
                </div>
                <span className="min-w-0 font-medium wrap-break-word">{e.auction.title}</span>
              </Link>
              {actions(e)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AuctionStatusBadge status={e.auction.status} />
              <span className="text-sm tnum">{price(e)}</span>
            </div>
            <Countdown startTime={e.auction.startTime} endTime={e.auction.endTime} status={e.auction.status} />
          </CardContent>
        </Card>
      )}
    />
  );
}
