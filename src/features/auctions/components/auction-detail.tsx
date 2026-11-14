'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gavel, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Countdown } from '@/components/common/countdown';
import { MemberAvatar } from '@/components/common/member-avatar';
import { RichText } from '@/components/common/rich-text';
import { useAuthStore } from '@/store/auth-store';
import { useLiveStore } from '@/store/live-store';
import { useRecentlyViewedStore } from '@/store/recently-viewed-store';
import { formatINR } from '@/lib/utils';
import { auctionErrorMessage } from '../auctions.errors';
import type { AuctionDetail } from '../auctions.types';
import { useAuction, useDeleteAuction } from '../use-auctions';
import { AuctionGallery } from './auction-gallery';
import { AuctionStatusBadge } from './auction-card';
import { ShareButtons } from './share-buttons';

export function AuctionDetailView({ initial, serverTime }: { initial: AuctionDetail; serverTime: string | null }) {
  const router = useRouter();
  const { data } = useAuction(initial.id, initial);
  const auction = data ?? initial;
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
    } = initial;
    useRecentlyViewedStore.getState().add({
      id, title, category, condition, coverImage, startingBidPaise, currentBidPaise, bidCount, startTime, endTime, status, seller,
    });
  }, [initial]);

  const isOwner = !!member && (member.id === auction.seller.id || member.role === 'SUPER_ADMIN');
  const canManage = isOwner && auction.bidCount === 0 && auction.status !== 'ENDED' && auction.status !== 'CANCELLED';
  const hasBids = auction.bidCount > 0;
  const currentPaise = hasBids ? auction.currentBidPaise : auction.startingBidPaise;
  const minNextPaise = hasBids ? auction.currentBidPaise + auction.minIncrementPaise : auction.startingBidPaise;

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
    <div className="grid gap-8 lg:grid-cols-2">
      <AuctionGallery images={auction.images} title={auction.title} />

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <AuctionStatusBadge status={auction.status} />
            <Badge variant="outline">{auction.condition === 'NEW' ? 'New' : 'Used'}</Badge>
            <Badge variant="secondary">{auction.category}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{auction.title}</h1>
          <Countdown startTime={auction.startTime} endTime={auction.endTime} status={auction.status} className="text-sm" />
        </div>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{hasBids ? 'Current bid' : 'Starting bid'}</p>
                <p className="text-3xl font-extrabold text-primary">{formatINR(currentPaise)}</p>
              </div>
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Gavel className="h-4 w-4" aria-hidden />
                {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
              </p>
            </div>
            {auction.status !== 'ENDED' && auction.status !== 'CANCELLED' && (
              <p className="text-sm text-muted-foreground">
                Minimum next bid: <span className="font-semibold text-foreground">{formatINR(minNextPaise)}</span>
                <span className="ml-1">(increment {formatINR(auction.minIncrementPaise)})</span>
              </p>
            )}
            {/* Phase 3 replaces this with the live bid panel. */}
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <Button type="button" className="w-full" disabled>
                Place bid
              </Button>
              <p className="text-center text-xs text-muted-foreground">Bidding opens in the next update</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 rounded-xl border p-3">
          <MemberAvatar id={auction.seller.id} name={auction.seller.name} email="" avatarUrl={auction.seller.avatarUrl} size="md" />
          <div>
            <p className="text-xs text-muted-foreground">Seller</p>
            <p className="font-medium">{auction.seller.name}</p>
          </div>
        </div>

        <ShareButtons title={auction.title} path={`/auctions/${auction.id}`} />

        {isOwner && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
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

      <section className="space-y-3 lg:col-span-2" aria-labelledby="description">
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
