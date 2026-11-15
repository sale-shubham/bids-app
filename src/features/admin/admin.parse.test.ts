import { describe, expect, it } from 'vitest';
import {
  parseAuctionAdminPage,
  parseCommissionAdminPage,
  parseDashboard,
  parseLegal,
  parseMemberPage,
  parsePaymentPage,
  parseSettings,
} from './admin.parse';

const page = (data: unknown[]) => ({ data, meta: { total: data.length, page: 1, pageSize: 20, totalPages: 1 } });

describe('admin.parse', () => {
  it('parseDashboard maps totals with 0 defaults', () => {
    const d = parseDashboard({
      data: {
        totals: { members: 5, bidsToday: 2 },
        revenueByMonth: [{ month: '2026-01', paidPaise: 100 }],
        signupsByMonth: [{ month: '2026-01', bidders: 3 }],
      },
    });
    expect(d.totals).toMatchObject({ members: 5, bidsToday: 2, liveAuctions: 0, commissionDuePaise: 0 });
    expect(d.revenueByMonth).toEqual([{ month: '2026-01', paidPaise: 100 }]);
    expect(d.signupsByMonth).toEqual([{ month: '2026-01', bidders: 3, auctioneers: 0 }]);
    expect(d.recentAuctions).toEqual([]);
    expect(parseDashboard(null).totals.members).toBe(0);
  });

  it('parseMemberPage: unknown role -> BIDDER, isActive defaults true', () => {
    const { items } = parseMemberPage(page([{ id: 'm', email: 'a@b.c', role: 'HACKER' }, { id: 'n', role: 'SUPER_ADMIN', isActive: false, phone: '' }]));
    expect(items[0]).toMatchObject({ role: 'BIDDER', isActive: true, phone: null, unpaidCommissionPaise: 0 });
    expect(items[1]).toMatchObject({ role: 'SUPER_ADMIN', isActive: false });
  });

  it('parsePaymentPage lowercases status and defaults to created', () => {
    const { items } = parsePaymentPage(page([{ status: 'PAID' }, { status: 'Failed' }, { status: 'CREATED' }, { status: 'paid' }, { status: 'bogus' }, {}]));
    expect(items.map((p) => p.status)).toEqual(['paid', 'failed', 'created', 'paid', 'created', 'created']);
  });

  it('parsePaymentPage maps member + gateway ids', () => {
    const { items } = parsePaymentPage(
      page([{ id: 'p', member: { id: 'm', name: 'N', email: 'e' }, amountPaise: 500, gatewayOrderId: 'o', gatewayPaymentId: '', referenceType: 'COMMISSION' }]),
    );
    expect(items[0]).toMatchObject({
      member: { id: 'm', name: 'N', email: 'e' },
      amountPaise: 500,
      gatewayOrderId: 'o',
      gatewayPaymentId: null,
      referenceType: 'COMMISSION',
    });
  });

  it('parseAuctionAdminPage adds sellerEmail', () => {
    const { items } = parseAuctionAdminPage(page([{ id: 'a', sellerEmail: 's@x.y' }, { id: 'b' }]));
    expect(items.map((i) => i.sellerEmail)).toEqual(['s@x.y', '']);
  });

  it('parseCommissionAdminPage keeps seller info per row', () => {
    const { items, meta } = parseCommissionAdminPage(page([{ id: 'c1', status: 'PAID', seller: { id: 's', name: 'S', email: 'e' } }, { id: 'c2' }]));
    expect(meta.total).toBe(2);
    expect(items[0]).toMatchObject({ status: 'PAID', seller: { id: 's', name: 'S', email: 'e' } });
    expect(items[1].seller).toEqual({ id: '', name: '', email: '' });
  });

  it('parseSettings falls back to documented defaults and filters categories', () => {
    expect(parseSettings({ data: { categories: ['Art', 3, 'Cars'] } })).toEqual({
      commissionRateBps: 500,
      minIncrementPaise: 10000,
      antiSnipingMinutes: 2,
      categories: ['Art', 'Cars'],
      maxPricePaise: 10_000_000_000,
      checkoutMode: 'optional',
      depositThresholdPaise: 0,
      depositRateBps: 1000,
      featuredEnabled: false,
      featuredPrices: { '1': 0, '3': 0, '7': 0 },
    });
    expect(parseSettings({ data: { depositThresholdPaise: 10_000_000, depositRateBps: 1500 } })).toMatchObject({ depositThresholdPaise: 10_000_000, depositRateBps: 1500 });
    expect(parseSettings({ data: { checkoutMode: 'required' } }).checkoutMode).toBe('required');
    expect(parseSettings({ data: { checkoutMode: 'bogus' } }).checkoutMode).toBe('optional');
    expect(parseSettings({ data: { maxPricePaise: 5_000_000_000 } }).maxPricePaise).toBe(5_000_000_000);
    expect(parseSettings({ data: { commissionRateBps: 0, antiSnipingMinutes: 0 } })).toMatchObject({ commissionRateBps: 0, antiSnipingMinutes: 0 });
  });

  it('parseLegal', () => {
    expect(parseLegal({ data: { title: 'T', content: '<p>x</p>', updatedAt: '2026-01-01' } }, 'terms-conditions')).toEqual({
      slug: 'terms-conditions',
      title: 'T',
      content: '<p>x</p>',
      updatedAt: '2026-01-01',
    });
    expect(parseLegal({}, 'privacy-policy')).toEqual({ slug: 'privacy-policy', title: '', content: '', updatedAt: null });
  });
});
