import { describe, expect, it } from 'vitest';
import { parseCheckout, parseCommissionPage, parseSummary } from './commissions.parse';

describe('commissions.parse', () => {
  const raw = {
    id: 'c1',
    auctionId: 'a1',
    auction: { id: 'a1', title: 'Vase', coverImage: 'https://x/y.jpg', finalBidPaise: 50000, endedAt: '2026-01-01T00:00:00Z' },
    rateBps: 500,
    amountPaise: 2500,
    status: 'PAID',
    dueAt: '2026-01-08T00:00:00Z',
    paidAt: '2026-01-02T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    isOverdue: false,
  };
  it('maps a full commission row', () => {
    const { items } = parseCommissionPage({ data: [raw], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });
    expect(items[0]).toMatchObject({ id: 'c1', status: 'PAID', amountPaise: 2500, auction: { title: 'Vase', finalBidPaise: 50000 } });
  });
  it('unknown status becomes DUE; WAIVED kept', () => {
    const { items } = parseCommissionPage({ data: [{ ...raw, status: 'weird' }, { ...raw, status: 'WAIVED' }] });
    expect(items.map((i) => i.status)).toEqual(['DUE', 'WAIVED']);
  });
  it('fills defaults for sparse rows', () => {
    const { items } = parseCommissionPage({ data: [{ id: 'c', auctionId: 'a' }] });
    expect(items[0]).toMatchObject({ auction: { id: 'a', title: 'Auction', coverImage: null, finalBidPaise: 0 }, isOverdue: false, paidAt: null });
  });
  it('parseSummary', () => {
    expect(parseSummary({ data: { unpaidPaise: 100, dueCount: 2, overdueCount: 1 } })).toEqual({ unpaidPaise: 100, dueCount: 2, overdueCount: 1 });
    expect(parseSummary(null)).toEqual({ unpaidPaise: 0, dueCount: 0, overdueCount: 0 });
  });
  it('parseCheckout maps the stub payload and defaults', () => {
    const c = parseCheckout({ data: { orderId: 'o', amountPaise: 2500, keyId: 'stub', prefill: { name: 'N', email: '' } } });
    expect(c).toMatchObject({ orderId: 'o', keyId: 'stub', currency: 'INR', description: 'NobleBid commission' });
    expect(c.prefill).toEqual({ name: 'N', email: undefined, contact: undefined });
  });
});
