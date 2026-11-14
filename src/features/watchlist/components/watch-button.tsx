'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useIsWatching, useToggleWatch } from '../use-watchlist';

interface WatchButtonProps {
  auctionId: string;
  /** `overlay` floats on a card image; `inline` is a labelled button (detail page). */
  variant?: 'overlay' | 'inline';
  className?: string;
}

// Heart toggle. Guests are sent to /login?next=<here>.
export function WatchButton({ auctionId, variant = 'overlay', className }: WatchButtonProps) {
  const router = useRouter();
  const member = useAuthStore((s) => s.member);
  const initialized = useAuthStore((s) => s.initialized);
  const watching = useIsWatching(auctionId);
  const toggle = useToggleWatch();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!member) {
      if (!initialized) return;
      // Read at click time (no useSearchParams: that would force every static page using a card to be dynamic).
      const here = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    toggle.mutate({ auctionId, watching: !watching });
  };

  const label = watching ? 'Remove from watchlist' : 'Add to watchlist';
  const heart = <Heart className={cn('h-4 w-4', watching && 'fill-current text-pink-600')} aria-hidden />;

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={watching}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        {heart}
        {watching ? 'Watching' : 'Watch'}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={watching}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur-xs transition hover:bg-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {heart}
    </button>
  );
}
