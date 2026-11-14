'use client';
import { cn } from '@/lib/utils';
import { useLiveStore } from '@/store/live-store';

/** Green "Live" dot while the socket is open; otherwise a grey note that the page polls. */
export function LiveIndicator({ className }: { className?: string }) {
  const open = useLiveStore((s) => s.status === 'open');
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)} role="status">
      <span className={cn('h-2 w-2 rounded-full', open ? 'bg-success' : 'bg-muted-foreground/50')} aria-hidden />
      {open ? <span className="font-medium text-success">Live</span> : 'Updating every 10 s'}
    </span>
  );
}
