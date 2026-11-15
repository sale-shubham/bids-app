'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Countdown } from '@/components/common/countdown';
import { MemberAvatar } from '@/components/common/member-avatar';
import { RichText } from '@/components/common/rich-text';
import { useAuthStore } from '@/store/auth-store';
import { useLiveStore } from '@/store/live-store';
import { useRecentlyViewedStore } from '@/store/recently-viewed-store';
import { auctionErrorMessage } from '../auctions.errors';
import type { AuctionDetail } from '../auctions.types';
import { BidHistory } from '@/features/bids/components/bid-history';
import { BidPanel } from '@/features/bids/components/bid-panel';
import { LiveIndicator } from '@/features/live/components/live-indicator';
import { useAuctionLive } from '@/features/live/use-auction-live';
import { useAuction, useAuctionBoundaryRefetch, useDeleteAuction } from '../use-auctions';
import { AuctionGallery } from './auction-gallery';
import { AuctionStatusBadge } from './auction-card';
import { ShareButtons } from './share-buttons';
import { WatchButton } from '@/features/watchlist/components/watch-button';

export function AuctionDetailView({ initial, serverTime }: { initial: AuctionDetail; serverTime: string | null }) {
  const router = useRouter();
  const { data, refetch } = useAuction(initial.id, initial);
  const auction = data ?? initial;
  useAuctionBoundaryRefetch(auction, refetch);
  useAuctionLive(initial.id);
  const member = useAuthStore((s) => s.member);
  const syncServerTime = useLiveStore((s) => s.syncServerTime);
  const del = useDeleteAuction();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (serverTime) syncServerTime(serverTime);
  }, [serverTime, syncServerTime]);

  // Record the visit (card snapshot only, not the description).
  React.useEffect(() => {
    void useRecentlyViewedStore.persist.rehydrate();
    const {
      id, title, category, condition, coverImage, startingBidPaise, currentBidPaise, bidCount, startTime, endTime, status, seller,
      buyNowPricePaise, hasReserve, reserveMet,
    } = initial;
    useRecentlyViewedStore.getState().add({
      id, title, category, condition, coverImage, startingBidPaise, currentBidPaise, bidCount, startTime, endTime, status, seller,
      buyNowPricePaise, hasReserve, reserveMet,
    });
  }, [initial]);

  const isOwner = !!member && member.id === auction.seller.id; // SUPER_ADMIN manages auctions under /admin, not /sell
  const canManage = isOwner && auction.bidCount === 0 && auction.status !== 'ENDED' && auction.status !== 'CANCELLED';
  const hasBids = auction.bidCount > 0;

  const onDelete = () =>
    del.mutate(auction.id, {
      onSuccess: () => {
        toast.success('Auction deleted');
        router.replace('/sell/auctions');
      },
      onError: (e) => {
        toast.error(auctionErrorMessage(e, 'Could not delete the auction'));
        setConfirmOpen(false);
      },
    });

  return (
    <div className="grid gap-8 @3xl/content:grid-cols-2">
      <AuctionGallery images={auction.images} title={auction.title} />

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <AuctionStatusBadge status={auction.status} />
            <Badge variant="outline">{auction.condition === 'NEW' ? 'New' : 'Used'}</Badge>
            <Badge variant="secondary">{auction.category}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight @lg/content:text-3xl">{auction.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Countdown startTime={auction.startTime} endTime={auction.endTime} status={auction.status} className="text-sm" />
            {(auction.status === 'LIVE' || auction.status === 'SCHEDULED') && <LiveIndicator />}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <WatchButton auctionId={auction.id} variant="inline" />
            {(auction.watcherCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" aria-hidden />
                {auction.watcherCount} {auction.watcherCount === 1 ? 'person is' : 'people are'} watching
              </span>
            )}
          </div>
        </div>

        <BidPanel auction={auction} />

        <Link
          href={`/sellers/${auction.seller.id}`}
          className="flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-accent/40"
        >
          <MemberAvatar id={auction.seller.id} name={auction.seller.name} email="" avatarUrl={auction.seller.avatarUrl} size="md" />
          <div>
            <p className="text-xs text-muted-foreground">Seller</p>
            <p className="font-medium">{auction.seller.name}</p>
          </div>
        </Link>

        <ShareButtons title={auction.title} path={`/auctions/${auction.id}`} />

        {isOwner && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button asChild variant="outline" size="sm">
              <Link href={`/sell/auctions/${auction.id}`}>Manage</Link>
            </Button>
            {canManage ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/sell/auctions/${auction.id}/edit`}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {hasBids ? 'This auction has bids, so it can no longer be edited or deleted.' : 'This auction has ended.'}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="@3xl/content:col-span-2">
        <BidHistory auctionId={auction.id} recentBids={auction.recentBids ?? []} bidCount={auction.bidCount} />
      </div>

      <section className="space-y-3 @3xl/content:col-span-2" aria-labelledby="description">
        <h2 id="description" className="text-lg font-semibold">
          Description
        </h2>
        <RichText html={auction.description} />
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this auction?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </div>
  );
}
