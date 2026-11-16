'use client';
import * as React from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { AuctionForm } from '@/features/auctions/components/auction-form';
import { auctionErrorMessage } from '@/features/auctions/auctions.errors';
import { useAuction } from '@/features/auctions/use-auctions';
import { useAuthStore } from '@/store/auth-store';

const blocked = (text: string) => (
  <Notice tone="error" action={{ label: 'Back to my auctions', href: '/sell/auctions' }}>
    {text}
  </Notice>
);

export default function EditAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const { data: auction, isPending, error } = useAuction(id);
  const member = useAuthStore((s) => s.member);

  let body: React.ReactNode;
  if (isPending) body = <Skeleton className="h-96 w-full" />;
  else if (error || !auction) body = blocked(auctionErrorMessage(error, 'Could not load this auction'));
  else if (member && member.id !== auction.seller.id) body = blocked('You can only edit your own auctions.');
  else if (auction.bidCount > 0) body = blocked('This auction already has bids, so it can no longer be edited.');
  else if (auction.status === 'ENDED' || auction.status === 'CANCELLED') body = blocked('This auction has ended and cannot be edited.');
  else body = <AuctionForm auction={auction} />;

  // Same width as the form (max-w-3xl) so the title and the form line up.
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Edit auction" backHref={auction ? `/sell/auctions/${auction.id}` : '/sell/auctions'} backLabel="Back" />
      {body}
    </div>
  );
}
