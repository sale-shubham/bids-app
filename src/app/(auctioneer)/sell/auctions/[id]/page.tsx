'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ExternalLink, Gavel, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Countdown } from '@/components/common/countdown';
import { auctionErrorMessage } from '@/features/auctions/auctions.errors';
import { AuctionStatusBadge } from '@/features/auctions/components/auction-card';
import { useAuctionLive } from '@/features/live/use-auction-live';
import { useAuction, useAuctionBoundaryRefetch, useDeleteAuction } from '@/features/auctions/use-auctions';
import { AuctionResult } from '@/features/bids/components/auction-result';
import { BidHistory } from '@/features/bids/components/bid-history';
import { basePricePaise } from '@/features/bids/bids.utils';
import { formatINR } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

export default function SellAuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: auction, isPending, error, refetch } = useAuction(id);
  useAuctionBoundaryRefetch(auction, refetch);
  useAuctionLive(id);
  const member = useAuthStore((s) => s.member);
  const del = useDeleteAuction();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (isPending) return <Skeleton className="h-96 w-full" />;
  if (error || !auction) return <Notice text={auctionErrorMessage(error, 'Could not load this auction')} />;
  if (member && member.id !== auction.seller.id && member.role !== 'SUPER_ADMIN') return <Notice text="You can only manage your own auctions." />;

  const closed = auction.status === 'ENDED' || auction.status === 'CANCELLED';
  const canManage = auction.bidCount === 0 && !closed;

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 @lg/content:flex-row @lg/content:items-start @lg/content:justify-between">
        <div className="space-y-2">
          <AuctionStatusBadge status={auction.status} />
          <h1 className="text-2xl font-bold tracking-tight">{auction.title}</h1>
          <Countdown startTime={auction.startTime} endTime={auction.endTime} status={auction.status} className="text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/auctions/${auction.id}`}>
              <ExternalLink className="h-4 w-4" /> Public page
            </Link>
          </Button>
          {canManage && (
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
          )}
        </div>
      </div>

      <Card>
        <CardContent className="flex items-end justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-muted-foreground">{auction.bidCount > 0 ? 'Current bid' : 'Starting bid'}</p>
            <p className="text-3xl font-extrabold text-primary">{formatINR(basePricePaise(auction))}</p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Gavel className="h-4 w-4" aria-hidden />
            {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
          </p>
        </CardContent>
      </Card>

      {closed && <AuctionResult auction={auction} />}

      <BidHistory auctionId={auction.id} recentBids={auction.recentBids ?? []} bidCount={auction.bidCount} alwaysFull />

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

function Notice({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild variant="outline">
        <Link href="/sell/auctions">Back to my auctions</Link>
      </Button>
    </div>
  );
}
