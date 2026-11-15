'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Gavel, ImageOff, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Countdown } from '@/components/common/countdown';
import { VerifiedBadge } from '@/components/common/verified-badge';
import { MemberAvatar } from '@/components/common/member-avatar';
import { formatDate, formatINR } from '@/lib/utils';
import { WatchButton } from '@/features/watchlist/components/watch-button';
import type { AuctionCard as AuctionCardData, AuctionStatus } from '../auctions.types';
import { estimateText } from './listing-info';

const STATUS: Record<AuctionStatus, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  LIVE: { label: 'Live', variant: 'success' },
  SCHEDULED: { label: 'Upcoming', variant: 'warning' },
  ENDED: { label: 'Ended', variant: 'secondary' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

export function AuctionStatusBadge({ status, className }: { status: AuctionStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <Badge variant={s.variant} dot className={className}>
      {s.label}
    </Badge>
  );
}

// next/image cover with a neutral placeholder when there is no image or it fails to load.
export function CoverImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = React.useState<string | null>(null);
  if (!src || failed === src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
        <ImageOff className="h-8 w-8" aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(src)}
      className={className ?? 'object-cover'}
    />
  );
}

export function AuctionCard({ auction, priority }: { auction: AuctionCardData; priority?: boolean }) {
  const hasBids = auction.bidCount > 0;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs transition hover:border-primary/40 hover:shadow-md">
      <Link
        href={`/auctions/${auction.id}`}
        className="flex flex-1 flex-col focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
          <CoverImage
            src={auction.coverImage}
            alt={auction.title}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <AuctionStatusBadge status={auction.status} className="absolute left-2 top-2 border-border bg-background/90 backdrop-blur-xs" />
          {auction.hasVideo && (
            <span
              title="Has video"
              className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-background/90 p-1.5 text-foreground backdrop-blur-xs"
            >
              <Video className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Has video</span>
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3 pb-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{auction.title}</h3>
          <div className="flex items-end justify-between gap-2">
            {auction.sold ? (
              <p className="text-sm font-semibold text-primary">
                Sold for {formatINR(auction.currentBidPaise)} · {formatDate(auction.endedAt ?? auction.endTime)}
              </p>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">{hasBids ? 'Current bid' : 'Starting bid'}</p>
                <p className="text-base font-bold text-primary">{formatINR(hasBids ? auction.currentBidPaise : auction.startingBidPaise)}</p>
              </div>
            )}
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Gavel className="h-3.5 w-3.5" aria-hidden />
              {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
            </p>
          </div>
          {estimateText(auction.estimateLowPaise, auction.estimateHighPaise, '\u2013') && (
            <p className="text-xs text-muted-foreground">Est. {estimateText(auction.estimateLowPaise, auction.estimateHighPaise, '\u2013')}</p>
          )}
          {typeof auction.buyNowPricePaise === 'number' && auction.status !== 'ENDED' && auction.status !== 'CANCELLED' && (
            <Badge variant="default" className="w-fit">
              Buy now {formatINR(auction.buyNowPricePaise)}
            </Badge>
          )}
          <Countdown startTime={auction.startTime} endTime={auction.endTime} status={auction.status} />
        </div>
      </Link>
      {/* Seller link and heart sit beside (not inside) the card link: nested anchors are invalid. */}
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        <Link href={`/sellers/${auction.seller.id}`} className="inline-flex max-w-full items-center gap-2 hover:text-foreground hover:underline">
          <MemberAvatar id={auction.seller.id} name={auction.seller.name} email="" avatarUrl={auction.seller.avatarUrl} size="sm" className="h-5 w-5 text-[10px]" />
          <span className="truncate">{auction.seller.name}</span>
          <VerifiedBadge verified={auction.seller.verified} />
        </Link>
      </div>
      <WatchButton auctionId={auction.id} className="absolute right-2 top-2" />
    </div>
  );
}
