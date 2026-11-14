'use client';
import * as React from 'react';
import { Clock } from 'lucide-react';
import { useLiveStore } from '@/store/live-store';
import { cn } from '@/lib/utils';

// One shared 1 s interval drives every Countdown on the page (started on the
// first subscriber, stopped with the last).
let nowMs = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  nowMs = Date.now();
  if (!timer) {
    timer = setInterval(() => {
      nowMs = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const getSnapshot = () => nowMs;
const getServerSnapshot = () => 0;

/** Current time in server-clock milliseconds, ticking every second (0 until mounted). */
export function useServerNow(): number {
  const tick = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const offset = useLiveStore((s) => s.serverOffsetMs);
  return tick === 0 ? 0 : tick + offset;
}

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

function format(ms: number) {
  const { d, h, m, s } = parts(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

const HOUR = 3_600_000;

export type CountdownPhase = 'starts' | 'ends' | 'ended';

export function auctionPhase(
  a: { startTime: string; endTime: string; status: string },
  now: number,
): { phase: CountdownPhase; remainingMs: number } {
  if (a.status === 'ENDED' || a.status === 'CANCELLED') return { phase: 'ended', remainingMs: 0 };
  const start = Date.parse(a.startTime);
  const end = Date.parse(a.endTime);
  if (now < start) return { phase: 'starts', remainingMs: start - now };
  if (now < end) return { phase: 'ends', remainingMs: end - now };
  return { phase: 'ended', remainingMs: 0 };
}

export function Countdown({
  startTime,
  endTime,
  status,
  className,
  showIcon = true,
}: {
  startTime: string;
  endTime: string;
  status: string;
  className?: string;
  showIcon?: boolean;
}) {
  const now = useServerNow();
  if (now === 0) {
    // Before mount (server render): stable placeholder, no clock-dependent text.
    return <span className={cn('text-xs text-muted-foreground', className)}>&nbsp;</span>;
  }
  const { phase, remainingMs } = auctionPhase({ startTime, endTime, status }, now);
  const soon = phase === 'ends' && remainingMs < HOUR;
  const label = phase === 'starts' ? 'Starts in' : phase === 'ends' ? 'Ends in' : status === 'CANCELLED' ? 'Cancelled' : 'Ended';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium tabular-nums',
        soon ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      {showIcon && <Clock className="h-3.5 w-3.5" aria-hidden />}
      <span>{label}</span>
      {phase !== 'ended' && <span className={cn('font-semibold', soon ? 'text-destructive' : 'text-foreground')}>{format(remainingMs)}</span>}
    </span>
  );
}
