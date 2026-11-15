import { describe, expect, it } from 'vitest';
import { parseSale, parseSalePage, parseSaleResponse } from './sales.parse';
import { disputeSchema, shipSchema, toShipPayload } from './sales.schema';
import { SALE_STATUSES, type SaleDTO, type SaleRole, type SaleStatus } from './sales.types';
import { needsDeliveryChoice, saleActions, saleTimeline } from './sales.utils';

const NOW = Date.parse('2026-11-15T12:00:00Z');
const future = '2026-11-20T00:00:00Z';
const past = '2026-11-10T00:00:00Z';

const act = (status: SaleStatus, role: SaleRole, payBy: string | null = future) => saleActions({ status, role, payBy }, NOW);

describe('saleActions', () => {
  it('buyer can pay only while AWAITING_PAYMENT and before payBy', () => {
    expect(act('AWAITING_PAYMENT', 'BUYER').canPay).toBe(true);
    expect(act('AWAITING_PAYMENT', 'BUYER', null).canPay).toBe(true);
    const late = act('AWAITING_PAYMENT', 'BUYER', past);
    expect(late.canPay).toBe(false);
    expect(late.payWindowClosed).toBe(true);
    expect(act('PAID', 'BUYER').canPay).toBe(false);
  });
  it('buyer can confirm PAID/SHIPPED and report PAID/SHIPPED/DELIVERED', () => {
    for (const s of SALE_STATUSES) {
      expect(act(s, 'BUYER').canConfirm).toBe(s === 'PAID' || s === 'SHIPPED');
      expect(act(s, 'BUYER').canDispute).toBe(s === 'PAID' || s === 'SHIPPED' || s === 'DELIVERED');
    }
  });
  it('seller can only ship a PAID sale', () => {
    for (const s of SALE_STATUSES) expect(act(s, 'SELLER').canShip).toBe(s === 'PAID');
    expect(act('PAID', 'SELLER')).toMatchObject({ canPay: false, canConfirm: false, canDispute: false });
  });
  it('admin may release / refund unsettled paid sales, never an awaiting, refunded or completed one', () => {
    for (const s of ['PAID', 'SHIPPED'] as const) expect(act(s, 'ADMIN')).toMatchObject({ canRelease: false, canRefund: true });
    for (const s of ['DELIVERED', 'DISPUTED'] as const) expect(act(s, 'ADMIN')).toMatchObject({ canRelease: true, canRefund: true });
    for (const s of ['AWAITING_PAYMENT', 'RELEASED', 'REFUNDED', 'CANCELLED'] as const) expect(act(s, 'ADMIN')).toMatchObject({ canRelease: false, canRefund: false });
    expect(act('PAID', 'BUYER').canRelease).toBe(false);
  });
});

const sale = (over: Partial<SaleDTO> = {}): SaleDTO => parseSale({ id: 's1', status: 'PAID', role: 'BUYER', createdAt: '2026-11-01T00:00:00Z', paidAt: '2026-11-02T00:00:00Z', ...over });

describe('saleTimeline', () => {
  it('shows upcoming steps while the sale is open', () => {
    const t = saleTimeline(sale());
    expect(t.map((s) => [s.key, s.done])).toEqual([
      ['created', true],
      ['paid', true],
      ['shipped', false],
      ['delivered', false],
      ['released', false],
    ]);
  });
  it('drops unreached steps once terminal and adds refund / dispute events', () => {
    const t = saleTimeline(sale({ status: 'REFUNDED', disputedAt: '2026-11-03T00:00:00Z', refundedAt: '2026-11-04T00:00:00Z' }));
    expect(t.map((s) => s.key)).toEqual(['created', 'paid', 'disputed', 'refunded']);
  });
  it('labels pickup', () => {
    const t = saleTimeline(sale({ status: 'SHIPPED', shippingMethod: 'PICKUP', shippedAt: '2026-11-03T00:00:00Z' }));
    expect(t.find((s) => s.key === 'shipped')?.label).toBe('Ready for pickup');
  });
});

describe('sales parsing', () => {
  it('parses a full DTO and keeps optional seller / contact fields only when present', () => {
    const s = parseSale({
      id: 's1',
      auctionId: 'a1',
      auction: { id: 'a1', title: 'Vase', coverImage: 'x.jpg' },
      status: 'SHIPPED',
      itemPaise: 100000,
      shippingFeePaise: 5000,
      amountPaise: 105000,
      role: 'SELLER',
      shippingMethod: 'COURIER',
      courier: 'DTDC',
      commissionPaise: 5000,
      payoutPaise: 100000,
      buyerContact: { name: 'B', email: 'b@x.in', phone: '9999999999' },
      buyer: { id: 'b', name: 'B' },
      seller: { id: 'u', name: 'S' },
    });
    expect(s).toMatchObject({ status: 'SHIPPED', role: 'SELLER', courier: 'DTDC', payoutPaise: 100000, buyerContact: { email: 'b@x.in' } });
    expect(s.sellerContact).toBeUndefined();
    const bare = parseSale({ id: 'x' });
    expect(bare).toMatchObject({ status: 'AWAITING_PAYMENT', role: 'BUYER' });
    expect('payoutPaise' in bare || 'buyerContact' in bare).toBe(false);
  });
  it('response and page envelopes', () => {
    expect(parseSaleResponse({ data: { id: 's9', status: 'PAID' } }).id).toBe('s9');
    expect(parseSaleResponse({ data: { sale: { id: 's8' } } }).id).toBe('s8');
    const p = parseSalePage({ data: [{ id: 'a' }, { id: 'b' }], meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 } });
    expect(p.items.map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('disputeSchema', () => {
  it('requires 10..1000 characters (trimmed)', () => {
    expect(disputeSchema.safeParse({ reason: 'too short' }).success).toBe(false);
    expect(disputeSchema.safeParse({ reason: '   123456789   ' }).success).toBe(false);
    expect(disputeSchema.safeParse({ reason: '1234567890' }).success).toBe(true);
    expect(disputeSchema.safeParse({ reason: 'x'.repeat(1000) }).success).toBe(true);
    expect(disputeSchema.safeParse({ reason: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('shipSchema', () => {
  it('courier is required for COURIER only', () => {
    const r = shipSchema.safeParse({ method: 'COURIER', courier: '', trackingNo: '' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ['courier'], message: 'Enter the courier name' });
    expect(shipSchema.safeParse({ method: 'PICKUP', courier: '', trackingNo: '' }).success).toBe(true);
    expect(shipSchema.safeParse({ method: 'COURIER', courier: 'DTDC', trackingNo: '' }).success).toBe(true);
  });
  it('caps courier and tracking at 60 characters', () => {
    expect(shipSchema.safeParse({ method: 'COURIER', courier: 'x'.repeat(61), trackingNo: '' }).success).toBe(false);
    expect(shipSchema.safeParse({ method: 'PICKUP', courier: '', trackingNo: 'x'.repeat(61) }).success).toBe(false);
  });
  it('payload omits empty / irrelevant fields', () => {
    expect(toShipPayload({ method: 'COURIER', courier: ' DTDC ', trackingNo: ' T1 ' })).toEqual({ method: 'COURIER', courier: 'DTDC', trackingNo: 'T1' });
    expect(toShipPayload({ method: 'PICKUP', courier: 'ignored', trackingNo: '' })).toEqual({ method: 'PICKUP' });
  });
});

describe('delivery choice (sale DTO)', () => {
  it('parses deliveryChoice and shippingOptions', () => {
    const s = parseSale({
      id: 's', status: 'AWAITING_PAYMENT', deliveryChoice: 'PICKUP',
      shippingOptions: { pickup: true, pickupCity: 'Pune', courier: true, shippingFeePaise: 15000, shipsWithinDays: 2 },
    });
    expect(s.deliveryChoice).toBe('PICKUP');
    expect(s.shippingOptions).toEqual({ pickup: true, pickupCity: 'Pune', courier: true, shippingFeePaise: 15000, shipsWithinDays: 2 });
    const legacy = parseSale({ id: 's' });
    expect(legacy.deliveryChoice).toBeNull();
    expect(legacy.shippingOptions).toBeNull();
  });
  it('needsDeliveryChoice: unpaid and both options offered', () => {
    const both = { pickup: true, courier: true };
    expect(needsDeliveryChoice({ status: 'AWAITING_PAYMENT', shippingOptions: both })).toBe(true);
    expect(needsDeliveryChoice({ status: 'PAID', shippingOptions: both })).toBe(false);
    expect(needsDeliveryChoice({ status: 'AWAITING_PAYMENT', shippingOptions: { pickup: false, courier: true } })).toBe(false);
    expect(needsDeliveryChoice({ status: 'AWAITING_PAYMENT', shippingOptions: null })).toBe(false);
  });
});
