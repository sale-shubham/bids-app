'use client';
import * as React from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReviewDialog } from './review-dialog';

/** "Rate the seller" button that owns its dialog (auction result + My bids Won tab). */
export function RateSellerButton({ auctionId, sellerName, size = 'sm' }: { auctionId: string; sellerName: string; size?: 'sm' | 'default' }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={() => setOpen(true)}>
        <Star className="h-4 w-4" aria-hidden /> Rate the seller
      </Button>
      <ReviewDialog auctionId={auctionId} sellerName={sellerName} open={open} onOpenChange={setOpen} />
    </>
  );
}
