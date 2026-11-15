import { describe, expect, it } from 'vitest';
import { filesToUpload, indexFiles, mapRow, mapRows, missingImages, parseCsv, rowErrors, templateCsv, toPayload } from './bulk.csv';

const NOW = new Date('2026-11-15T10:00:00.000Z');
const HEADER = 'title,description,category,condition,startingBid,minIncrement,reservePrice,buyNowPrice,estimateLow,estimateHigh,startAt,durationHours,images';
const good = {
  title: 'Brass lamp',
  description: 'A polished brass lamp in working order.',
  category: 'Home & Garden',
  condition: 'used',
  startingBid: '1,500',
  minIncrement: '50',
  reservePrice: '2000',
  buyNowPrice: '5000',
  estimateLow: '2500',
  estimateHigh: '3500',
  startAt: 'now',
  durationHours: '72',
  images: 'Front.JPG|side.png',
};
const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

describe('parseCsv', () => {
  it('round-trips the template', () => {
    const res = parseCsv(templateCsv());
    expect(res.fileErrors).toEqual([]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].images).toBe('lamp-front.jpg|lamp-side.jpg');
    expect(mapRow(res.rows[0], 0, NOW).errors).toEqual([]);
  });

  it('matches headers case-insensitively and handles quoted commas and a BOM', () => {
    const csv = `﻿${HEADER.toUpperCase()}\n"Brass lamp","Nice, polished lamp for sale today",Art,NEW,100,,,,,,now,24,a.jpg\n`;
    const res = parseCsv(csv);
    expect(res.fileErrors).toEqual([]);
    expect(res.rows[0].description).toBe('Nice, polished lamp for sale today');
  });

  it('reports missing columns', () => {
    const res = parseCsv('title,description\nx,y\n');
    expect(res.fileErrors[0]).toMatch(/Missing columns: category, condition/);
    expect(res.rows).toEqual([]);
  });

  it('caps at 50 rows with a file error', () => {
    const line = 'Brass lamp,A polished brass lamp in working order.,Art,NEW,100,,,,,,now,24,a.jpg';
    const res = parseCsv([HEADER, ...Array.from({ length: 51 }, () => line)].join('\n'));
    expect(res.rows).toHaveLength(50);
    expect(res.fileErrors.join(' ')).toMatch(/At most 50 rows/);
  });
});

describe('mapRow', () => {
  it('converts rupees to paise and builds the payload from startAt now + duration', () => {
    const row = mapRow(good, 0, NOW);
    expect(row.errors).toEqual([]);
    const urls = new Map([
      ['front.jpg', 'https://cdn/1.webp'],
      ['side.png', 'https://cdn/2.webp'],
    ]);
    const p = toPayload(row, urls, NOW);
    expect(p).toMatchObject({
      title: 'Brass lamp',
      category: 'Home & Garden',
      condition: 'USED',
      startingBidPaise: 150000,
      minIncrementPaise: 5000,
      reservePricePaise: 200000,
      buyNowPricePaise: 500000,
      estimateLowPaise: 250000,
      estimateHighPaise: 350000,
      images: ['https://cdn/1.webp', 'https://cdn/2.webp'],
      startTime: '2026-11-15T10:00:00.000Z',
      endTime: '2026-11-18T10:00:00.000Z',
    });
  });

  it('uses an ISO startAt', () => {
    const row = mapRow({ ...good, startAt: '2026-12-01T10:00:00.000Z', durationHours: '1' }, 0, NOW);
    const p = toPayload(row, new Map([['front.jpg', 'a'], ['side.png', 'b']]), NOW);
    expect(p.startTime).toBe('2026-12-01T10:00:00.000Z');
    expect(p.endTime).toBe('2026-12-01T11:00:00.000Z');
  });

  it('accepts all six condition grades by code or label, any case', () => {
    const cases: [string, string][] = [['new', 'NEW'], ['Like new', 'LIKE_NEW'], ['LIKE_NEW', 'LIKE_NEW'], ['good', 'GOOD'], ['Fair', 'FAIR'], ['used', 'USED'], ['for parts', 'FOR_PARTS'], ['FOR_PARTS', 'FOR_PARTS'], ['For parts / not working', 'FOR_PARTS']];
    for (const [input, grade] of cases) expect(mapRow({ ...good, condition: input }, 0, NOW).draft?.condition).toBe(grade);
  });

  it('flags each invalid field', () => {
    const row = mapRow(
      { title: 'ab', description: 'short', category: '', condition: 'BROKEN', startingBid: 'abc', startAt: 'tomorrow', durationHours: '0', images: '' },
      3,
      NOW,
    );
    expect(row.index).toBe(3);
    expect(row.draft).toBeNull();
    expect(row.errors.map((e) => e.field)).toEqual(['title', 'description', 'category', 'condition', 'startingBid', 'startAt', 'durationHours', 'images']);
  });

  it('checks price relations and the image cap', () => {
    const row = mapRow({ ...good, reservePrice: '1000', buyNowPrice: '1500', estimateLow: '9', estimateHigh: '5', images: 'a|b|c|d|e|f|g|h|i' }, 0, NOW);
    const fields = row.errors.map((e) => e.field);
    expect(fields).toContain('reservePrice');
    expect(fields).toContain('buyNowPrice');
    expect(fields).toContain('estimateLow');
    expect(fields).toContain('images');
  });

  it('rejects a start in the past', () => {
    expect(mapRow({ ...good, startAt: '2026-01-01T00:00:00Z' }, 0, NOW).errors.map((e) => e.field)).toContain('startAt');
  });

  it('mapRows indexes rows', () => {
    expect(mapRows([good, good], NOW).map((r) => r.index)).toEqual([0, 1]);
  });
});

describe('image file matching', () => {
  it('matches names case-insensitively and reports the missing ones', () => {
    const files = indexFiles([file('front.jpg'), file('SIDE.PNG')]);
    const row = mapRow({ ...good, images: 'Front.JPG|side.png|back.jpg' }, 0, NOW);
    expect(missingImages(row, files)).toEqual(['back.jpg']);
    expect(rowErrors(row, files).at(-1)).toEqual({ field: 'images', message: 'No selected file named back.jpg.' });
  });

  it('uploads each shared file once', () => {
    const files = indexFiles([file('a.jpg'), file('b.jpg')]);
    const rows = mapRows([{ ...good, images: 'a.jpg|b.jpg' }, { ...good, images: 'A.JPG' }], NOW);
    expect(filesToUpload(rows, files).map((f) => f.name)).toEqual(['a.jpg', 'b.jpg']);
  });
});
