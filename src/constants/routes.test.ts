import { describe, expect, it } from 'vitest';
import {
  destinationFor,
  gateFor,
  homeFor,
  isAdminRoute,
  isAuctioneerRoute,
  isAuthRoute,
  isBidderRoute,
  isMemberRoute,
  isGatedRoute,
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
    expect(isAuthRoute('/')).toBe(true); // exact match only
    expect(isAuthRoute('/auctions')).toBe(false);
    expect(isAuthRoute('/auctions')).toBe(false);
    expect(isAdminRoute('/admin/members')).toBe(true);
    expect(isAuctioneerRoute('/sell/auctions/new')).toBe(true);
    expect(isBidderRoute('/my-bids')).toBe(true);
    expect(isMemberRoute('/profile')).toBe(true);
    expect(isMemberRoute('/notifications')).toBe(true);
  });
  it('public routes need no login', () => {
    for (const p of ['/auctions', '/auctions/x', '/leaderboard', '/sellers/1', '/pages/terms', '/suspended']) {
      expect(isPublicRoute(p)).toBe(true);
    }
    // Marketing pages moved to bids-website; "/" is the guest-only root.
    for (const p of ['/', '/how-it-works', '/about', '/contact', '/admin', '/sell', '/my-bids', '/watchlist', '/login']) {
      expect(isPublicRoute(p)).toBe(false);
    }
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

describe('gateFor (edge gate decision table)', () => {
  it('guests: public + root + auth pages pass, everything gated goes to login', () => {
    for (const p of ['/', '/login', '/auctions', '/auctions/x', '/leaderboard', '/pages/privacy-policy', '/how-it-works']) {
      expect(gateFor(p, undefined)).toBe('allow');
    }
    for (const p of ['/admin', '/admin/profile', '/sell/new', '/my-bids', '/watchlist', '/profile', '/notifications']) {
      expect(gateFor(p, undefined)).toBe('login');
    }
  });
  it('signed-in users are sent home from guest-only routes, including "/"', () => {
    for (const role of ['BIDDER', 'AUCTIONEER', 'SUPER_ADMIN'] as const) {
      expect(gateFor('/', role)).toBe('home');
      expect(gateFor('/login', role)).toBe('home');
    }
  });
  it('SUPER_ADMIN may only use /admin/* plus the public pages', () => {
    expect(gateFor('/admin', 'SUPER_ADMIN')).toBe('allow');
    expect(gateFor('/admin/profile', 'SUPER_ADMIN')).toBe('allow');
    expect(gateFor('/auctions/x', 'SUPER_ADMIN')).toBe('allow');
    for (const p of ['/sell/auctions', '/my-bids', '/watchlist', '/profile', '/notifications']) {
      expect(gateFor(p, 'SUPER_ADMIN')).toBe('home'); // -> /admin
    }
  });
  it('BIDDER / AUCTIONEER never reach /admin; the bidder/auctioneer split holds', () => {
    expect(gateFor('/admin/members', 'BIDDER')).toBe('home');
    expect(gateFor('/admin', 'AUCTIONEER')).toBe('home');
    expect(gateFor('/my-bids', 'BIDDER')).toBe('allow');
    expect(gateFor('/my-bids', 'AUCTIONEER')).toBe('home');
    expect(gateFor('/sell/new', 'AUCTIONEER')).toBe('allow');
    expect(gateFor('/sell/new', 'BIDDER')).toBe('home');
    for (const role of ['BIDDER', 'AUCTIONEER'] as const) {
      for (const p of ['/watchlist', '/profile', '/notifications']) expect(gateFor(p, role)).toBe('allow');
    }
  });
  it('Phase C routes: purchases are BIDDER only, sales and payouts AUCTIONEER only, admin sales SUPER_ADMIN only', () => {
    for (const p of ['/purchases', '/purchases/s1']) {
      expect(isBidderRoute(p)).toBe(true);
      expect(gateFor(p, 'BIDDER')).toBe('allow');
      expect(gateFor(p, 'AUCTIONEER')).toBe('home');
      expect(gateFor(p, 'SUPER_ADMIN')).toBe('home');
      expect(gateFor(p, undefined)).toBe('login');
    }
    for (const p of ['/sell/sales', '/sell/sales/s1', '/sell/payouts']) {
      expect(gateFor(p, 'AUCTIONEER')).toBe('allow');
      expect(gateFor(p, 'BIDDER')).toBe('home');
      expect(gateFor(p, 'SUPER_ADMIN')).toBe('home');
      expect(gateFor(p, undefined)).toBe('login');
    }
    expect(gateFor('/admin/sales', 'SUPER_ADMIN')).toBe('allow');
    expect(gateFor('/admin/sales', 'BIDDER')).toBe('home');
    expect(gateFor('/admin/sales', undefined)).toBe('login');
  });
  it('isGatedRoute covers exactly the areas the gate cares about', () => {
    expect(isGatedRoute('/')).toBe(true);
    expect(isGatedRoute('/admin/profile')).toBe(true);
    expect(isGatedRoute('/auctions')).toBe(false);
    expect(isGatedRoute('/suspended')).toBe(false);
  });
});

describe('destinationFor', () => {
  it('members follow a safe ?next=, falling back to their home', () => {
    expect(destinationFor('BIDDER', '/auctions/abc')).toBe('/auctions/abc');
    expect(destinationFor('AUCTIONEER', '//evil.com')).toBe('/sell/auctions');
    expect(destinationFor('BIDDER', null)).toBe('/auctions');
  });
  it('SUPER_ADMIN always lands on /admin', () => {
    expect(destinationFor('SUPER_ADMIN', '/auctions/abc')).toBe('/admin');
  });
});

describe('second-chance offer routes', () => {
  it('/purchases/offers/* is in the bidder class', () => {
    expect(isBidderRoute('/purchases/offers/o1')).toBe(true);
    expect(gateFor('/purchases/offers/o1', 'BIDDER')).toBe('allow');
    expect(gateFor('/purchases/offers/o1', 'AUCTIONEER')).toBe('home');
    expect(gateFor('/purchases/offers/o1', undefined)).toBe('login');
  });
});
