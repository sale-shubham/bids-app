import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  combineDateTime,
  defaultFormValues,
  makeAuctionFormSchema,
  paiseToRupees,
  relistFormValues,
  republishSchema,
  resolveWindow,
  rupeesToPaise,
  toDateInput,
  toTimeInput,
  toWritePayload,
  withoutNullPrices,
  type AuctionFormValues,
} from './auctions.schema';

const NOW = new Date(2026, 5, 15, 12, 0, 0); // local time, avoids TZ drift
const H = 3_600_000;
const DAY = 24 * H;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const form = (over: Partial<AuctionFormValues> = {}): AuctionFormValues => ({
  title: 'Antique brass vase',
  description: '<p>A lovely old vase in great condition.</p>',
  category: 'Antiques',
  condition: 'USED',
  images: ['https://cdn.example.com/a.jpg'],
  startingBid: '1500',
  minIncrement: '',
  reservePrice: '',
  buyNowPrice: '',
  startNow: true,
  startDate: '',
  startTime: '',
  duration: '7',
  endDate: '',
  endTime: '',
  ...over,
});

const issues = (v: AuctionFormValues, original?: string, max?: number) => {
  const r = makeAuctionFormSchema(original, max).safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('money helpers', () => {
  it('rupees <-> paise', () => {
    expect(rupeesToPaise('1500')).toBe(150000);
    expect(rupeesToPaise('12.34')).toBe(1234);
    expect(rupeesToPaise('0.29')).toBe(29); // float-safe rounding
    expect(paiseToRupees(150050)).toBe('1500.5');
  });
});

describe('makeAuctionFormSchema', () => {
  it('caps starting bid and increment at the platform maximum', () => {
    expect(issues(form({ startingBid: '100000000' }))).toEqual([]); // ₹10 crore default
    expect(issues(form({ startingBid: '100000001' }))).toContain('startingBid: Starting bid can be at most ₹10,00,00,000');
    expect(issues(form({ startingBid: '2000000' }), undefined, 100_000_000)).toContain('startingBid: Starting bid can be at most ₹10,00,000');
    expect(issues(form({ startingBid: '1000', minIncrement: '2000000' }), undefined, 100_000_000)).toContain('minIncrement: Minimum increment can be at most ₹10,00,000');
    expect(issues(form({ startingBid: '9000000000' }), undefined, 1_000_000_000_000)).toEqual([]);
  });
  it('accepts a valid start-now / 7 day form', () => {
    expect(issues(form())).toEqual([]);
  });
  it('field rules', () => {
    expect(issues(form({ title: 'abc' }))).toContain('title: At least 5 characters');
    expect(issues(form({ description: '<p></p>' + ' '.repeat(30) }))).toContain('description: Describe the item (at least 20 characters)');
    expect(issues(form({ images: [] }))).toContain('images: Add at least one image');
    expect(issues(form({ images: Array(9).fill('x') }))).toContain('images: At most 8 images');
    expect(issues(form({ startingBid: '' }))).toContain('startingBid: Starting bid is required');
    expect(issues(form({ startingBid: '0.5' }))).toContain('startingBid: Starting bid must be at least ₹1');
    expect(issues(form({ minIncrement: '0.5' }))).toContain('minIncrement: Minimum increment is ₹1');
    expect(issues(form({ minIncrement: '5' }))).toEqual([]);
  });
  it('scheduled start must be chosen and not in the past', () => {
    expect(issues(form({ startNow: false }))).toContain('startDate: Choose a start date and time');
    const past = new Date(NOW.getTime() - 3 * H);
    expect(issues(form({ startNow: false, startDate: toDateInput(past), startTime: toTimeInput(past) }))).toContain('startDate: Start time cannot be in the past');
    const future = new Date(NOW.getTime() + 2 * H);
    expect(issues(form({ startNow: false, startDate: toDateInput(future), startTime: toTimeInput(future) }))).toEqual([]);
  });
  it('allows an unchanged past start when editing (original start)', () => {
    const past = new Date(NOW.getTime() - 3 * H);
    const v = form({ startNow: false, startDate: toDateInput(past), startTime: toTimeInput(past) });
    expect(issues(v, past.toISOString())).toEqual([]);
  });
  it('custom end: required, min 1 hour, max 30 days', () => {
    expect(issues(form({ duration: 'custom' }))).toContain('endDate: Choose an end date and time');
    const mk = (ms: number) => {
      const d = new Date(NOW.getTime() + ms);
      return form({ duration: 'custom', endDate: toDateInput(d), endTime: toTimeInput(d) });
    };
    expect(issues(mk(30 * 60_000))).toContain('endDate: Auction must run for at least 1 hour');
    expect(issues(mk(31 * DAY))).toContain('endDate: Auction can run for at most 30 days');
    expect(issues(mk(2 * DAY))).toEqual([]);
  });
});

describe('reserve / Buy It Now rules', () => {
  it('both are optional', () => {
    expect(issues(form())).toEqual([]);
  });
  it('reserve must be at least the starting bid', () => {
    expect(issues(form({ reservePrice: '1000' }))).toContain('reservePrice: Reserve price must be at least the starting bid');
    expect(issues(form({ reservePrice: '1500' }))).toEqual([]);
  });
  it('Buy It Now must be above the starting bid and at least the reserve', () => {
    expect(issues(form({ buyNowPrice: '1500' }))).toContain('buyNowPrice: Buy It Now price must be above the starting bid');
    expect(issues(form({ buyNowPrice: '1501' }))).toEqual([]);
    expect(issues(form({ reservePrice: '3000', buyNowPrice: '2500' }))).toContain('buyNowPrice: Buy It Now price must be at least the reserve price');
    expect(issues(form({ reservePrice: '3000', buyNowPrice: '3000' }))).toEqual([]);
  });
  it('both are capped at the platform maximum', () => {
    expect(issues(form({ reservePrice: '2000000' }), undefined, 100_000_000)).toContain('reservePrice: Reserve price can be at most ₹10,00,000');
    expect(issues(form({ buyNowPrice: '2000000' }), undefined, 100_000_000)).toContain('buyNowPrice: Buy It Now price can be at most ₹10,00,000');
  });
  it('payload: rupees to paise, null when empty; withoutNullPrices drops nulls for create', () => {
    const p = toWritePayload(form({ reservePrice: '2000.50', buyNowPrice: '3000' }));
    expect(p).toMatchObject({ reservePricePaise: 200050, buyNowPricePaise: 300000 });
    const empty = toWritePayload(form());
    expect(empty).toMatchObject({ reservePricePaise: null, buyNowPricePaise: null });
    const created = withoutNullPrices(empty);
    expect('reservePricePaise' in created).toBe(false);
    expect('buyNowPricePaise' in created).toBe(false);
    expect(withoutNullPrices(p).reservePricePaise).toBe(200050);
  });
  it('edit pre-fill reads the prices; relist pre-fill keeps pricing but not the dates', () => {
    const a = { title: 'T', description: 'D', category: 'C', condition: 'NEW', images: ['i'], startingBidPaise: 150000, minIncrementPaise: 10000, reservePricePaise: 200000, buyNowPricePaise: 400000, startTime: NOW.toISOString(), endTime: NOW.toISOString() } as never;
    expect(defaultFormValues(a)).toMatchObject({ reservePrice: '2000', buyNowPrice: '4000' });
    expect(relistFormValues(a)).toMatchObject({ title: 'T', startingBid: '1500', reservePrice: '2000', buyNowPrice: '4000', startNow: true, duration: '7', startDate: '' });
    expect(defaultFormValues({ ...(a as object), reservePricePaise: null } as never).reservePrice).toBe('');
  });
});

describe('resolveWindow / toWritePayload', () => {
  it('preset durations add whole days to the start', () => {
    const { start, end } = resolveWindow(form({ duration: '3' }));
    expect(start?.getTime()).toBe(NOW.getTime());
    expect(end!.getTime() - start!.getTime()).toBe(3 * DAY);
  });
  it('payload converts rupees to paise and ISO times', () => {
    const p = toWritePayload(form({ title: '  Vase  ', startingBid: '1500.50', minIncrement: '25' }));
    expect(p).toMatchObject({ title: 'Vase', startingBidPaise: 150050, minIncrementPaise: 2500 });
    expect(p.startTime).toBe(NOW.toISOString());
    expect(p.endTime).toBe(new Date(NOW.getTime() + 7 * DAY).toISOString());
  });
  it('omits minIncrementPaise when blank (server default applies)', () => {
    expect('minIncrementPaise' in toWritePayload(form())).toBe(false);
  });
  it('combineDateTime', () => {
    expect(combineDateTime('', '10:00')).toBeNull();
    expect(combineDateTime('2026-02-31x', '10:00')).toBeNull();
    expect(combineDateTime('2026-02-03', '10:30')?.getHours()).toBe(10);
  });
  it('defaultFormValues round-trips an existing auction', () => {
    const start = new Date(2026, 5, 20, 9, 5);
    const end = new Date(2026, 5, 25, 18, 45);
    const v = defaultFormValues({
      title: 'T', description: 'D', category: 'C', condition: 'NEW', images: ['i'],
      startingBidPaise: 150000, minIncrementPaise: 10000, startTime: start.toISOString(), endTime: end.toISOString(),
    } as never);
    expect(v).toMatchObject({ startingBid: '1500', minIncrement: '100', startNow: false, startDate: '2026-06-20', startTime: '09:05', duration: 'custom', endDate: '2026-06-25', endTime: '18:45' });
    expect(defaultFormValues().startNow).toBe(true);
  });
});

describe('republishSchema', () => {
  const at = (ms: number) => new Date(NOW.getTime() + ms);
  const vals = (s: Date, e: Date) => ({ startDate: toDateInput(s), startTime: toTimeInput(s), endDate: toDateInput(e), endTime: toTimeInput(e) });
  it('valid window passes', () => {
    expect(republishSchema.safeParse(vals(at(H), at(DAY + H))).success).toBe(true);
  });
  it('rejects past start and short span', () => {
    expect(republishSchema.safeParse(vals(at(-5 * H), at(DAY))).success).toBe(false);
    const r = republishSchema.safeParse(vals(at(H), at(H + 30 * 60_000)));
    expect(r.error?.issues[0].message).toBe('Auction must run for at least 1 hour');
  });
  it('requires all four fields', () => {
    expect(republishSchema.safeParse({ startDate: '', startTime: '', endDate: '', endTime: '' }).success).toBe(false);
  });
});
