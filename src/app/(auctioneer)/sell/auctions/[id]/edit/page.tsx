'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AuctionForm } from '@/features/auctions/components/auction-form';
import { auctionErrorMessage } from '@/features/auctions/auctions.errors';
import { useAuction } from '@/features/auctions/use-auctions';
import { useAuthStore } from '@/store/auth-store';

export default function EditAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const { data: auction, isPending, error } = useAuction(id);
  const member = useAuthStore((s) => s.member);

  let body: React.ReactNode;
  if (isPending) body = <Skeleton className="h-96 w-full" />;
  else if (error || !auction) body = <Notice text={auctionErrorMessage(error, 'Could not load this auction')} />;
  else if (member && member.id !== auction.seller.id && member.role !== 'SUPER_ADMIN') body = <Notice text="You can only edit your own auctions." />;
  else if (auction.bidCount > 0) body = <Notice text="This auction already has bids, so it can no longer be edited." />;
  else if (auction.status === 'ENDED' || auction.status === 'CANCELLED') body = <Notice text="This auction has ended and cannot be edited." />;
  else body = <AuctionForm auction={auction} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit auction</h1>
      {body}
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
