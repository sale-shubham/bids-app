'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Eye, Gavel, Pencil, Plus, RotateCw, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Countdown } from '@/components/common/countdown';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusTabs } from '@/features/admin/components/admin-list';
import { useUrlState } from '@/features/admin/use-url-state';
import { AuctionStatusBadge, CoverImage } from '@/features/auctions/components/auction-card';
import { RepublishDialog } from '@/features/auctions/components/republish-dialog';
import { auctionErrorMessage } from '@/features/auctions/auctions.errors';
import type { AuctionCard, MineStatus } from '@/features/auctions/auctions.types';
import { useDeleteAuction, useMyAuctions } from '@/features/auctions/use-auctions';
import { formatINR } from '@/lib/utils';

const TABS: { value: MineStatus; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
];
// The first tab is the default: it is what `/sell/auctions` shows and it keeps the URL clean.
const DEFAULTS = { status: TABS[0].value as string };

function SellAuctionsView() {
  const { values, update } = useUrlState(DEFAULTS);
  const tab = (TABS.find((t) => t.value === values.status)?.value ?? TABS[0].value) as MineStatus;
  const list = useMyAuctions(tab);
  const del = useDeleteAuction();
  const [toDelete, setToDelete] = React.useState<AuctionCard | null>(null);
  const [republishId, setRepublishId] = React.useState<string | null>(null);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Auction deleted');
        setToDelete(null);
      },
      onError: (e) => {
        toast.error(auctionErrorMessage(e, 'Could not delete the auction'));
        setToDelete(null);
      },
    });
  };

  const actions = (a: AuctionCard) => {
    const editable = a.bidCount === 0 && (a.status === 'SCHEDULED' || a.status === 'LIVE');
    const republishable = a.status === 'ENDED' && a.bidCount === 0;
    const menu: RowAction[] = [
      { label: 'Bids', icon: Gavel, href: `/sell/auctions/${a.id}` },
      { label: 'View', icon: Eye, href: `/auctions/${a.id}` },
    ];
    if (editable) menu.push({ label: 'Edit', icon: Pencil, href: `/sell/auctions/${a.id}/edit` });
    if (republishable) menu.push({ label: 'Republish', icon: RotateCw, onSelect: () => setRepublishId(a.id) });
    if (editable) menu.push({ label: 'Delete', icon: Trash2, destructive: true, separated: true, onSelect: () => setToDelete(a) });
    return <RowActionsMenu name={a.title} actions={menu} />;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="My auctions"
        action={
          <Button asChild>
            <Link href="/sell/new">
              <Plus className="h-4 w-4" /> New auction
            </Link>
          </Button>
        }
      />

      <ListToolbar tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ status: v })} />} />

      {list.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">{auctionErrorMessage(list.error, 'Could not load your auctions')}</p>
          <Button variant="outline" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Store}
          title={`No ${tab} auctions`}
          description={tab === 'live' || tab === 'upcoming' ? 'Create an auction to get started.' : undefined}
          actionLabel={tab === 'live' || tab === 'upcoming' ? 'Create auction' : undefined}
          actionHref="/sell/new"
        />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-3 @lg/content:flex-row @lg/content:items-center">
                  <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-muted @lg/content:w-32">
                    <CoverImage src={a.coverImage} alt={a.title} sizes="128px" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AuctionStatusBadge status={a.status} />
                      <span className="text-xs text-muted-foreground">{a.category}</span>
                    </div>
                    <Link href={`/sell/auctions/${a.id}`} className="block truncate font-semibold hover:underline">
                      {a.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {a.bidCount > 0 ? `Current ${formatINR(a.currentBidPaise)}` : `Starts at ${formatINR(a.startingBidPaise)}`} · {a.bidCount} {a.bidCount === 1 ? 'bid' : 'bids'}
                    </p>
                    <Countdown startTime={a.startTime} endTime={a.endTime} status={a.status} />
                  </div>
                  <div className="self-end @lg/content:self-center">{actions(a)}</div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <InfiniteScroll onLoadMore={() => void list.fetchNextPage()} hasMore={!!list.hasNextPage && !list.isFetchNextPageError} loading={list.isFetchingNextPage} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this auction?"
        description={toDelete ? `"${toDelete.title}" will be removed. This cannot be undone.` : undefined}
        confirmLabel="Delete"
        variant="destructive"
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
      <RepublishDialog auctionId={republishId} open={!!republishId} onOpenChange={(o) => !o && setRepublishId(null)} />
    </div>
  );
}

export default function SellAuctionsPage() {
  return (
    <Suspense>
      <SellAuctionsView />
    </Suspense>
  );
}
