import { describe, expect, it } from 'vitest';
import { profileSchema } from './members/members.schema';
import { legalPagesFormSchema } from './legal/legal.schema';
import { bpsToPercent, formToSettings, marketplaceSchema, percentToBps, settingsToForm } from './admin/admin.schema';

const msgs = (r: { success: boolean; error?: { issues: { message: string }[] } }) => (r.success ? [] : r.error!.issues.map((i) => i.message));

describe('profileSchema', () => {
  it('phone may be empty or a plausible number', () => {
    expect(profileSchema.safeParse({ name: 'Asha', phone: '', address: '' }).success).toBe(true);
    expect(profileSchema.safeParse({ name: 'Asha', phone: '+91 98765-43210', address: '' }).success).toBe(true);
    expect(msgs(profileSchema.safeParse({ name: 'Asha', phone: 'abc', address: '' }))).toContain('Enter a valid phone number');
  });
});

describe('legalPagesFormSchema', () => {
  it('allows empty content per slug', () => {
    expect(legalPagesFormSchema.safeParse({ contents: { 'terms-conditions': '' } }).success).toBe(true);
    expect(legalPagesFormSchema.safeParse({ contents: { x: 5 } }).success).toBe(false);
  });
});

describe('marketplaceSchema (admin settings)', () => {
  const ok = { commissionPercent: '5.00', minIncrementRupees: '100', antiSnipingMinutes: '2', maxPriceRupees: '100000000', categories: ['Art', 'Cars'], checkoutMode: 'optional' as const };
  it('accepts valid settings and converts to API units', () => {
    const r = marketplaceSchema.safeParse(ok);
    expect(r.success).toBe(true);
    expect(formToSettings(r.data!)).toEqual({ commissionRateBps: 500, minIncrementPaise: 10000, antiSnipingMinutes: 2, categories: ['Art', 'Cars'], maxPricePaise: 10_000_000_000, checkoutMode: 'optional' });
  });
  it('checkout mode: accepts off / optional / required, rejects anything else', () => {
    for (const m of ['off', 'optional', 'required']) expect(marketplaceSchema.safeParse({ ...ok, checkoutMode: m }).success).toBe(true);
    expect(marketplaceSchema.safeParse({ ...ok, checkoutMode: 'always' }).success).toBe(false);
    expect(formToSettings(marketplaceSchema.parse({ ...ok, checkoutMode: 'required' })).checkoutMode).toBe('required');
  });
  it('round-trips settings through the form', () => {
    const s = { commissionRateBps: 750, minIncrementPaise: 12550, antiSnipingMinutes: 5, categories: ['A1'], maxPricePaise: 250_000_000_000, checkoutMode: 'required' as const };
    expect(settingsToForm(s)).toEqual({ commissionPercent: '7.50', minIncrementRupees: '125.5', antiSnipingMinutes: '5', maxPriceRupees: '2500000000', categories: ['A1'], checkoutMode: 'required' });
    expect(bpsToPercent(500)).toBe('5.00');
    expect(percentToBps('7.5')).toBe(750);
  });
  it('rejects out-of-range or malformed numbers', () => {
    expect(msgs(marketplaceSchema.safeParse({ ...ok, commissionPercent: '31' }))).toContain('Must be between 0% and 30%');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, commissionPercent: '5.123' }))).toContain('At most 2 decimal places');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, minIncrementRupees: '0.5' }))).toContain('Must be at least ₹1');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, antiSnipingMinutes: '1.5' }))).toContain('Whole minutes only');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, antiSnipingMinutes: '31' }))).toContain('Must be between 0 and 30 minutes');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, commissionPercent: '' }))).toContain('Commission is required');
  });
  it('maximum price: INR 1,000 .. 1,000 crore, whole paise', () => {
    expect(marketplaceSchema.safeParse({ ...ok, maxPriceRupees: '1000' }).success).toBe(true);
    expect(marketplaceSchema.safeParse({ ...ok, maxPriceRupees: '10000000000' }).success).toBe(true);
    expect(msgs(marketplaceSchema.safeParse({ ...ok, maxPriceRupees: '999' }))).toContain('Must be at least ₹1,000');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, maxPriceRupees: '10000000001' }))).toContain('Must be at most ₹10,00,00,00,000');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, maxPriceRupees: '' }))).toContain('Maximum price is required');
    expect(formToSettings(marketplaceSchema.parse({ ...ok, maxPriceRupees: '10000000000' })).maxPricePaise).toBe(1_000_000_000_000);
  });
  it('categories: at least one, unique case-insensitively', () => {
    expect(msgs(marketplaceSchema.safeParse({ ...ok, categories: [] }))).toContain('Add at least one category');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, categories: ['Art', 'art'] }))).toContain('Categories must be unique');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, categories: ['A'] }))).toContain('At least 2 characters');
  });
});
