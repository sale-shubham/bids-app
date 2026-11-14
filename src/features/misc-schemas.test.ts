import { describe, expect, it } from 'vitest';
import { contactSchema } from './contact/contact.schema';
import { profileSchema } from './members/members.schema';
import { legalPagesFormSchema } from './legal/legal.schema';
import { bpsToPercent, formToSettings, marketplaceSchema, percentToBps, settingsToForm } from './admin/admin.schema';

const msgs = (r: { success: boolean; error?: { issues: { message: string }[] } }) => (r.success ? [] : r.error!.issues.map((i) => i.message));

describe('contactSchema', () => {
  const ok = { name: 'Asha', email: 'a@b.co', subject: 'Hello', message: 'This is a long enough message.' };
  it('accepts a valid message and trims', () => {
    expect(contactSchema.safeParse({ ...ok, name: '  Asha  ' }).data?.name).toBe('Asha');
  });
  it('validates each field', () => {
    expect(msgs(contactSchema.safeParse({ ...ok, name: 'A' }))).toContain('Enter your name');
    expect(msgs(contactSchema.safeParse({ ...ok, email: 'x' }))).toContain('Enter a valid email address');
    expect(msgs(contactSchema.safeParse({ ...ok, subject: 'hi' }))).toContain('Enter a subject');
    expect(msgs(contactSchema.safeParse({ ...ok, message: 'short' }))).toContain('Tell us a little more (at least 10 characters)');
    expect(msgs(contactSchema.safeParse({ ...ok, message: 'x'.repeat(2001) }))).toContain('Keep it under 2000 characters');
  });
});

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
  const ok = { commissionPercent: '5.00', minIncrementRupees: '100', antiSnipingMinutes: '2', categories: ['Art', 'Cars'] };
  it('accepts valid settings and converts to API units', () => {
    const r = marketplaceSchema.safeParse(ok);
    expect(r.success).toBe(true);
    expect(formToSettings(r.data!)).toEqual({ commissionRateBps: 500, minIncrementPaise: 10000, antiSnipingMinutes: 2, categories: ['Art', 'Cars'] });
  });
  it('round-trips settings through the form', () => {
    const s = { commissionRateBps: 750, minIncrementPaise: 12550, antiSnipingMinutes: 5, categories: ['A1'] };
    expect(settingsToForm(s)).toEqual({ commissionPercent: '7.50', minIncrementRupees: '125.5', antiSnipingMinutes: '5', categories: ['A1'] });
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
  it('categories: at least one, unique case-insensitively', () => {
    expect(msgs(marketplaceSchema.safeParse({ ...ok, categories: [] }))).toContain('Add at least one category');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, categories: ['Art', 'art'] }))).toContain('Categories must be unique');
    expect(msgs(marketplaceSchema.safeParse({ ...ok, categories: ['A'] }))).toContain('At least 2 characters');
  });
});
