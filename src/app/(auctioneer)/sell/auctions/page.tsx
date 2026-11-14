'use client';
import * as React from 'react';
import Link from 'next/link';
import { Eye, Pencil, Plus, RotateCw, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Countdown } from '@/components/common/countdown';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuctionStatusBadge, CoverImage } from '@/features/auctions/components/auction-card';
import { RepublishDialog } from '@/features/auctions/components/republish-dialog';
import { auctionErrorMessage } from '@/features/auctions/auctions.errors';
import type { AuctionCard, MineStatus } from '@/features/auctions/auctions.types';
import { useDeleteAuction, useMyAuctions } from '@/features/auctions/use-auctions';
import { formatINR } from '@/lib/utils';

const TABS: { value: MineStatus; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live', label: 'Live' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function SellAuctionsPage() {
  const [tab, setTab] = React.useState<MineStatus>('live');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My auctions</h1>
          <p className="text-muted-foreground">Create and manage your auctions.</p>
        </div>
        <Button asChild>
          <Link href="/sell/new">
            <Plus className="h-4 w-4" /> New auction
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as MineStatus)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
          {items.map((a) => {
            const editable = a.bidCount === 0 && (a.status === 'SCHEDULED' || a.status === 'LIVE');
            const republishable = a.status === 'ENDED' && a.bidCount === 0;
            return (
              <li key={a.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
                <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-32">
                  <CoverImage src={a.coverImage} alt={a.title} sizes="128px" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AuctionStatusBadge status={a.status} />
                    <span className="text-xs text-muted-foreground">{a.category}</span>
                  </div>
                  <p className="truncate font-semibold">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.bidCount > 0 ? `Current ${formatINR(a.currentBidPaise)}` : `Starts at ${formatINR(a.startingBidPaise)}`} · {a.bidCount} {a.bidCount === 1 ? 'bid' : 'bids'}
                  </p>
                  <Countdown startTime={a.startTime} endTime={a.endTime} status={a.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/auctions/${a.id}`}>
                      <Eye className="h-4 w-4" /> View
                    </Link>
                  </Button>
                  {editable && (
                    <>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/sell/auctions/${a.id}/edit`}>
                          <Pencil className="h-4 w-4" /> Edit
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setToDelete(a)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </>
                  )}
                  {republishable && (
                    <Button variant="outline" size="sm" onClick={() => setRepublishId(a.id)}>
                      <RotateCw className="h-4 w-4" /> Republish
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
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
