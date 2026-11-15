'use client';
import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Read-only stars for a whole rating (1-5). */
export function StarDisplay({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('h-4 w-4', n <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/40')} aria-hidden />
      ))}
    </span>
  );
}

/** Compact summary: "★ 4.6 (12)" or "No ratings yet". */
export function RatingSummary({ avg, count, className }: { avg?: number | null; count?: number; className?: string }) {
  if (avg == null || !count) {
    return <span className={cn('text-sm text-muted-foreground', className)}>No ratings yet</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', className)}>
      <Star className="h-4 w-4 fill-warning text-warning" aria-hidden />
      <span className="font-medium">{avg.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

/** Radio-group star picker with arrow-key support. `value` 0 = nothing chosen. */
export function StarRatingInput({ value, onChange, disabled, 'aria-label': ariaLabel = 'Rating' }: StarRatingInputProps) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (value || 2) - 1));
    }
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex items-center gap-1" onKeyDown={onKeyDown} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="rounded-sm p-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Star className={cn('h-7 w-7 transition-colors', n <= shown ? 'fill-warning text-warning' : 'text-muted-foreground/40')} aria-hidden />
        </button>
      ))}
    </div>
  );
}
