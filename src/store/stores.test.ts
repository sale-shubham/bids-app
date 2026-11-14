import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuctionCard } from '@/features/auctions/auctions.types';
import { useAuthStore, type AuthMember } from './auth-store';
import { useLiveStore } from './live-store';
import { useRecentlyViewedStore } from './recently-viewed-store';

const card = (id: string) => ({ id, title: `Auction ${id}` }) as unknown as AuctionCard;

describe('recently-viewed store', () => {
  beforeEach(() => {
    localStorage.clear();
    useRecentlyViewedStore.getState().clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('adds newest first and dedupes by id (moving it to the front)', () => {
    const { add } = useRecentlyViewedStore.getState();
    add(card('a'));
    add(card('b'));
    add(card('a'));
    expect(useRecentlyViewedStore.getState().items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('caps at 10 items, dropping the oldest', () => {
    const { add } = useRecentlyViewedStore.getState();
    for (let i = 0; i < 15; i++) add(card(String(i)));
    const ids = useRecentlyViewedStore.getState().items.map((i) => i.id);
    expect(ids).toHaveLength(10);
    expect(ids[0]).toBe('14');
    expect(ids[9]).toBe('5');
  });

  it('persists to localStorage and rehydrates (skipHydration)', async () => {
    useRecentlyViewedStore.getState().add(card('p'));
    expect(localStorage.getItem('nb-recently-viewed')).toContain('"p"');
    const saved = localStorage.getItem('nb-recently-viewed')!;
    useRecentlyViewedStore.setState({ items: [] }); // this also overwrites the stored copy
    localStorage.setItem('nb-recently-viewed', saved);
    await useRecentlyViewedStore.persist.rehydrate();
    expect(useRecentlyViewedStore.getState().items.map((i) => i.id)).toEqual(['p']);
  });

  it('keeps working in memory when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => useRecentlyViewedStore.getState().add(card('x'))).not.toThrow();
    expect(useRecentlyViewedStore.getState().items).toHaveLength(1);
    await expect(useRecentlyViewedStore.persist.rehydrate()).resolves.not.toThrow();
  });
});

describe('live store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    useLiveStore.setState({ serverOffsetMs: 0, status: 'idle', connectionSeq: 0 });
  });
  afterEach(() => vi.useRealTimers());

  it('syncServerTime stores server - device offset', () => {
    useLiveStore.getState().syncServerTime('2026-01-01T00:00:05.000Z');
    expect(useLiveStore.getState().serverOffsetMs).toBe(5000);
    useLiveStore.getState().syncServerTime('2025-12-31T23:59:58.000Z');
    expect(useLiveStore.getState().serverOffsetMs).toBe(-2000);
  });
  it('ignores an unparseable server time', () => {
    useLiveStore.setState({ serverOffsetMs: 123 });
    useLiveStore.getState().syncServerTime('not a date');
    expect(useLiveStore.getState().serverOffsetMs).toBe(123);
  });
  it('status and connectionSeq', () => {
    useLiveStore.getState().setStatus('open');
    useLiveStore.getState().markConnected();
    useLiveStore.getState().markConnected();
    expect(useLiveStore.getState()).toMatchObject({ status: 'open', connectionSeq: 2 });
  });
});

describe('auth store', () => {
  it('set / clear member and initialized flag', () => {
    const m = { id: 'u1', role: 'BIDDER' } as AuthMember;
    useAuthStore.getState().setMember(m);
    useAuthStore.getState().setInitialized(true);
    expect(useAuthStore.getState()).toMatchObject({ member: m, initialized: true });
    useAuthStore.getState().clear();
    expect(useAuthStore.getState().member).toBeNull();
    expect(useAuthStore.getState().initialized).toBe(true);
  });
});
