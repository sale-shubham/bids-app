import { describe, expect, it } from 'vitest';
import {
  homeFor,
  isAdminRoute,
  isAuctioneerRoute,
  isAuthRoute,
  isBidderRoute,
  isMemberRoute,
  isPublicRoute,
  safeNextPath,
  startsWithAny,
} from './routes';

describe('startsWithAny', () => {
  it('matches exact or prefix followed by a slash only', () => {
    expect(startsWithAny('/sell', ['/sell'])).toBe(true);
    expect(startsWithAny('/sell/auctions', ['/sell'])).toBe(true);
    expect(startsWithAny('/seller', ['/sell'])).toBe(false);
    expect(startsWithAny('/administrator', ['/admin'])).toBe(false);
  });
});

describe('safeNextPath', () => {
  it('keeps same-origin app paths (with query)', () => {
    expect(safeNextPath('/auctions/abc')).toBe('/auctions/abc');
    expect(safeNextPath('/watchlist?x=1')).toBe('/watchlist?x=1');
  });
  it('rejects open-redirect shapes', () => {
    for (const bad of ['//evil.com', 'https://evil.com', 'evil.com', '/\\evil.com', '/a\\b', '', null, undefined]) {
      expect(safeNextPath(bad as string | null | undefined)).toBeNull();
    }
  });
  it('rejects auth routes (redirect loops)', () => {
    expect(safeNextPath('/login')).toBeNull();
    expect(safeNextPath('/signup?x=1')).toBeNull();
    expect(safeNextPath('/reset-password')).toBeNull();
  });
});

describe('homeFor', () => {
  it('maps each role to its landing page', () => {
    expect(homeFor('SUPER_ADMIN')).toBe('/admin');
    expect(homeFor('AUCTIONEER')).toBe('/sell/auctions');
    expect(homeFor('BIDDER')).toBe('/auctions');
  });
});

describe('route classes (role -> allowed areas)', () => {
  it('classifies paths', () => {
    expect(isAuthRoute('/login')).toBe(true);
    expect(isAuthRoute('/auctions')).toBe(false);
    expect(isAdminRoute('/admin/members')).toBe(true);
    expect(isAuctioneerRoute('/sell/auctions/new')).toBe(true);
    expect(isBidderRoute('/my-bids')).toBe(true);
    expect(isMemberRoute('/profile')).toBe(true);
    expect(isMemberRoute('/notifications')).toBe(true);
  });
  it('public routes need no login', () => {
    for (const p of ['/', '/auctions', '/auctions/x', '/leaderboard', '/sellers/1', '/how-it-works', '/about', '/contact', '/pages/terms', '/suspended']) {
      expect(isPublicRoute(p)).toBe(true);
    }
    for (const p of ['/admin', '/sell', '/my-bids', '/watchlist', '/login']) expect(isPublicRoute(p)).toBe(false);
  });
  it('every protected area is disjoint from the public set', () => {
    for (const p of ['/admin/x', '/sell/x', '/my-bids', '/watchlist', '/profile', '/notifications']) {
      expect(isPublicRoute(p)).toBe(false);
    }
  });
  it('each role home is reachable by that role', () => {
    expect(isAdminRoute(homeFor('SUPER_ADMIN'))).toBe(true);
    expect(isAuctioneerRoute(homeFor('AUCTIONEER'))).toBe(true);
    expect(isPublicRoute(homeFor('BIDDER'))).toBe(true);
  });
});
