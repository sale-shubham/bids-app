import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import { getBottomNavItems, getOverflowNavItems } from './mobile-bottom-nav';
import { MEMBER_NAV, useMoreTab, useNav } from './nav-items';

vi.mock('@/features/watchlist/use-watchlist', () => ({ useWatchlistActiveCount: () => 3 }));

const signIn = (role: string) => useAuthStore.setState({ member: { id: 'u1', role } as unknown as AuthMember, initialized: true });

beforeEach(() => useAuthStore.setState({ member: null, initialized: true }));

describe('member nav', () => {
  it('is one list with Buying and Selling groups plus the always-shown items', () => {
    signIn('MEMBER');
    const { result } = renderHook(() => useNav());
    const labels = (group?: string) => result.current.filter((i) => i.group === group).map((i) => i.label);
    expect(labels('Buying')).toEqual(['My bids', 'Purchases']);
    expect(labels('Selling')).toEqual(['My auctions', 'Sales', 'Analytics', 'Payouts', 'Bulk upload']);
    expect(labels(undefined)).toEqual(['Auctions', 'Watchlist', 'Sold', 'Profile']);
  });

  it('every member role (legacy values included) gets the same nav', () => {
    for (const role of ['MEMBER', 'BIDDER', 'AUCTIONEER']) {
      signIn(role);
      const { result } = renderHook(() => useNav());
      expect(result.current.map((i) => i.href)).toEqual(MEMBER_NAV.map((i) => i.href));
    }
  });

  it('keeps the member URLs and carries the watchlist badge', () => {
    signIn('MEMBER');
    const { result } = renderHook(() => useNav());
    expect(result.current.map((i) => i.href)).toEqual(
      expect.arrayContaining(['/my-bids', '/purchases', '/sell/auctions', '/sell/sales', '/sell/analytics', '/sell/payouts', '/sell/bulk', '/watchlist', '/sold', '/profile']),
    );
    expect(result.current.find((i) => i.href === '/watchlist')?.badge).toBe(3);
  });

  it('pins Auctions, My bids and My auctions to the mobile bottom bar', () => {
    signIn('MEMBER');
    const { result } = renderHook(() => useNav());
    expect(getBottomNavItems(result.current).map((i) => i.label)).toEqual(['Auctions', 'My bids', 'My auctions']);
    const overflow = getOverflowNavItems(result.current).map((i) => i.label);
    expect(overflow).toEqual(['Watchlist', 'Sold', 'Purchases', 'Sales', 'Analytics', 'Payouts', 'Bulk upload']);
  });

  it('SUPER_ADMIN keeps the admin nav and admin Profile tab', () => {
    signIn('SUPER_ADMIN');
    const nav = renderHook(() => useNav()).result.current;
    expect(nav[0].href).toBe('/admin');
    expect(nav.every((i) => i.href.startsWith('/admin'))).toBe(true);
    expect(renderHook(() => useMoreTab()).result.current.href).toBe('/admin/profile');
  });
});
