import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveStore } from '@/store/live-store';
import { Countdown, auctionPhase } from './countdown';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const iso = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();
const S = 1000;
const M = 60 * S;
const H = 60 * M;
const D = 24 * H;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  useLiveStore.setState({ serverOffsetMs: 0 });
});
afterEach(() => vi.useRealTimers());

describe('auctionPhase', () => {
  const a = (status = 'LIVE') => ({ status, startTime: iso(-H), endTime: iso(H) });
  it('starts / ends / ended by time', () => {
    expect(auctionPhase({ status: 'SCHEDULED', startTime: iso(H), endTime: iso(2 * H) }, NOW.getTime())).toEqual({ phase: 'starts', remainingMs: H });
    expect(auctionPhase(a(), NOW.getTime())).toEqual({ phase: 'ends', remainingMs: H });
    expect(auctionPhase(a(), NOW.getTime() + 2 * H)).toEqual({ phase: 'ended', remainingMs: 0 });
  });
  it('ENDED / CANCELLED status wins over the clock', () => {
    expect(auctionPhase(a('ENDED'), NOW.getTime()).phase).toBe('ended');
    expect(auctionPhase(a('CANCELLED'), NOW.getTime()).phase).toBe('ended');
  });
});

describe('<Countdown />', () => {
  const show = (endOffset: number, status = 'LIVE', startOffset = -H) =>
    render(<Countdown startTime={iso(startOffset)} endTime={iso(endOffset)} status={status} />);

  it('formats minutes+seconds under an hour', () => {
    show(5 * M + 7 * S);
    expect(screen.getByText('Ends in')).toBeInTheDocument();
    expect(screen.getByText('5m 07s')).toBeInTheDocument();
  });
  it('formats hours', () => {
    show(3 * H + 4 * M + 9 * S);
    expect(screen.getByText('3h 04m 09s')).toBeInTheDocument();
  });
  it('formats days', () => {
    show(2 * D + 3 * H + 5 * M + 6 * S);
    expect(screen.getByText('2d 03h 05m 06s')).toBeInTheDocument();
  });
  it('ticks every second', () => {
    show(10 * S + M);
    expect(screen.getByText('1m 10s')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('1m 07s')).toBeInTheDocument();
  });
  it('flips to Ended when the end time passes', () => {
    show(2 * S);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('Ended')).toBeInTheDocument();
  });
  it('shows "Starts in" for upcoming auctions', () => {
    show(2 * H, 'SCHEDULED', 30 * M);
    expect(screen.getByText('Starts in')).toBeInTheDocument();
    expect(screen.getByText('30m 00s')).toBeInTheDocument();
  });
  it('labels cancelled auctions', () => {
    show(H, 'CANCELLED');
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
  it('follows the server clock offset', () => {
    useLiveStore.setState({ serverOffsetMs: 10 * M }); // server is 10 min ahead of the device
    show(15 * M);
    expect(screen.getByText('5m 00s')).toBeInTheDocument();
  });
  it('turns destructive (urgent) under an hour', () => {
    const { container } = show(30 * M);
    expect(container.firstElementChild?.className).toContain('text-destructive');
  });
  it('stops the shared interval after unmount', () => {
    const { unmount } = show(H);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
