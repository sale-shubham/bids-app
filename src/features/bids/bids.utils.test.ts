import { describe, expect, it } from 'vitest';
import { basePricePaise, ceilRupees, minNextBidPaise, rupeesToPaise } from './bids.utils';

const base = { startingBidPaise: 100000, currentBidPaise: 0, minIncrementPaise: 10000 };

describe('bids.utils', () => {
  it('basePricePaise: starting bid until someone bids', () => {
    expect(basePricePaise({ ...base, bidCount: 0 })).toBe(100000);
    expect(basePricePaise({ ...base, bidCount: 2, currentBidPaise: 130000 })).toBe(130000);
  });
  it('minNextBidPaise: first bid may equal the starting bid, then current + increment', () => {
    expect(minNextBidPaise({ ...base, bidCount: 0 })).toBe(100000);
    expect(minNextBidPaise({ ...base, bidCount: 1, currentBidPaise: 100000 })).toBe(110000);
  });
  it('rupeesToPaise accepts positive whole rupees only', () => {
    expect(rupeesToPaise('1500')).toBe(150000);
    expect(rupeesToPaise(' 1,500 ')).toBe(150000);
    for (const bad of ['', '0', '-5', '12.5', 'abc', '1e3', '1234567890123']) expect(rupeesToPaise(bad)).toBeNull();
  });
  it('rupeesToPaise handles amounts beyond int4 paise', () => {
    expect(rupeesToPaise('100000000')).toBe(10_000_000_000);
  });
  it('ceilRupees rounds up', () => {
    expect(ceilRupees(100000)).toBe(1000);
    expect(ceilRupees(100001)).toBe(1001);
  });
  it('quick-amount maths (base + k * increment) is monotonic', () => {
    const b = basePricePaise({ ...base, bidCount: 3, currentBidPaise: 120000 });
    expect([1, 2, 5].map((k) => b + k * base.minIncrementPaise)).toEqual([130000, 140000, 170000]);
  });
});
