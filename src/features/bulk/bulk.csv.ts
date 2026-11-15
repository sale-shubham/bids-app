import Papa from 'papaparse';
import { CONDITIONS, type AuctionCondition } from '@/features/auctions/auctions.types';
import type { BulkItemPayload, BulkRow, RowError } from './bulk.types';

export const MAX_BULK_ROWS = 50;
export const MAX_BULK_IMAGES_PER_ROW = 8;

export const BULK_COLUMNS = [
  'title',
  'description',
  'category',
  'condition',
  'startingBid',
  'minIncrement',
  'reservePrice',
  'buyNowPrice',
  'estimateLow',
  'estimateHigh',
  'startAt',
  'durationHours',
  'images',
] as const;

const REQUIRED = ['title', 'description', 'category', 'condition', 'startingBid', 'startAt', 'durationHours', 'images'] as const;

const EXAMPLE: Record<(typeof BULK_COLUMNS)[number], string> = {
  title: 'Vintage brass table lamp',
  description: 'Polished brass lamp from the 1960s in working condition, with the original shade and cord.',
  category: 'Home & Garden',
  condition: 'USED',
  startingBid: '1500',
  minIncrement: '50',
  reservePrice: '',
  buyNowPrice: '',
  estimateLow: '2000',
  estimateHigh: '3000',
  startAt: 'now',
  durationHours: '72',
  images: 'lamp-front.jpg|lamp-side.jpg',
};

/** The downloadable template: header + one example row. */
export function templateCsv(): string {
  return Papa.unparse({ fields: [...BULK_COLUMNS], data: [BULK_COLUMNS.map((c) => EXAMPLE[c])] });
}

export interface ParsedCsv {
  rows: Record<string, string>[];
  /** File-level problems (missing columns, no rows, too many rows). Empty = usable. */
  fileErrors: string[];
}

/** Parse CSV text into rows keyed by canonical column name (headers are matched case-insensitively). */
export function parseCsv(text: string): ParsedCsv {
  const canonical = new Map<string, string>(BULK_COLUMNS.map((c) => [c.toLowerCase(), c]));
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => canonical.get(h.trim().toLowerCase()) ?? h.trim(),
    transform: (v) => v.trim(),
  });
  const fields = res.meta.fields ?? [];
  const fileErrors: string[] = [];
  const missing = REQUIRED.filter((c) => !fields.includes(c));
  if (missing.length) fileErrors.push(`Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);
  if (!res.data.length && !missing.length) fileErrors.push('The CSV has no rows.');
  if (res.data.length > MAX_BULK_ROWS) fileErrors.push(`At most ${MAX_BULK_ROWS} rows per upload (found ${res.data.length}).`);
  return { rows: missing.length ? [] : res.data.slice(0, MAX_BULK_ROWS), fileErrors };
}

/** "1,500" / "Rs 1500.50" style input -> paise; null when blank, NaN when not a number. */
function rupeesToPaise(raw: string | undefined): number | null {
  const v = (raw ?? '').replace(/[₹,\s]/g, '');
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : Number.NaN;
}

export function splitImageNames(raw: string | undefined): string[] {
  return (raw ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Map + validate one CSV row (the same rules as the single-auction form; the API re-checks everything). */
export function mapRow(raw: Record<string, string>, index: number, now: Date): BulkRow {
  const errors: RowError[] = [];
  const err = (field: string, message: string) => errors.push({ field, message });

  const title = raw.title ?? '';
  if (title.length < 5 || title.length > 120) err('title', 'Title must be 5-120 characters.');
  const description = raw.description ?? '';
  if (description.length < 20 || description.length > 10000) err('description', 'Description must be 20-10,000 characters.');
  const category = raw.category ?? '';
  if (!category) err('category', 'Category is required.');
  // Accepts the code (LIKE_NEW) or the label ("Like new", "for parts"), any case.
  const cond = (raw.condition ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const grade = CONDITIONS.find((c) => c.value === cond || c.label.toUpperCase().replace(/[\s-]+/g, '_') === cond || (c.value === 'FOR_PARTS' && cond === 'FOR_PARTS_/_NOT_WORKING'))?.value;
  if (!grade) err('condition', 'Condition must be one of NEW, LIKE_NEW, GOOD, FAIR, USED, FOR_PARTS.');

  const money = (field: string, label: string, required = false) => {
    const p = rupeesToPaise(raw[field]);
    if (p === null) {
      if (required) err(field, `${label} is required.`);
      return undefined;
    }
    if (Number.isNaN(p) || p <= 0) {
      err(field, `${label} must be a positive number of rupees.`);
      return undefined;
    }
    return p;
  };
  const starting = money('startingBid', 'Starting bid', true);
  const minIncrement = money('minIncrement', 'Minimum increment');
  if (minIncrement !== undefined && minIncrement < 100) err('minIncrement', 'Minimum increment must be at least 1 rupee.');
  const reserve = money('reservePrice', 'Reserve price');
  const buyNow = money('buyNowPrice', 'Buy It Now price');
  const estLow = money('estimateLow', 'Estimate (low)');
  const estHigh = money('estimateHigh', 'Estimate (high)');
  if (starting !== undefined && reserve !== undefined && reserve < starting) err('reservePrice', 'Reserve must be at least the starting bid.');
  if (starting !== undefined && buyNow !== undefined && buyNow <= starting) err('buyNowPrice', 'Buy It Now must be above the starting bid.');
  if (reserve !== undefined && buyNow !== undefined && buyNow < reserve) err('buyNowPrice', 'Buy It Now must be at least the reserve.');
  if ((estLow === undefined) !== (estHigh === undefined)) err('estimateLow', 'Give both estimateLow and estimateHigh, or neither.');
  if (estLow !== undefined && estHigh !== undefined && estLow > estHigh) err('estimateLow', 'Estimate low must not exceed estimate high.');

  let startAt: Date | null = null;
  const rawStart = raw.startAt ?? '';
  if (rawStart.toLowerCase() !== 'now') {
    const d = new Date(rawStart);
    if (!rawStart || Number.isNaN(d.getTime())) err('startAt', 'startAt must be "now" or an ISO date/time, e.g. 2026-12-01T10:00:00+05:30.');
    else if (d.getTime() < now.getTime() - 60_000) err('startAt', 'startAt cannot be in the past.');
    else startAt = d;
  }
  const durationHours = Number(raw.durationHours);
  if (!Number.isFinite(durationHours) || durationHours < 1) err('durationHours', 'Duration must be at least 1 hour.');

  const imageNames = splitImageNames(raw.images);
  if (imageNames.length < 1) err('images', 'Add at least one image file name.');
  if (imageNames.length > MAX_BULK_IMAGES_PER_ROW) err('images', `At most ${MAX_BULK_IMAGES_PER_ROW} images per item.`);

  const draft: NonNullable<BulkRow['draft']> = {
    title,
    description,
    category,
    condition: (grade ?? 'USED') as AuctionCondition,
    startingBidPaise: starting ?? 0,
    ...(minIncrement !== undefined ? { minIncrementPaise: minIncrement } : {}),
    ...(reserve !== undefined ? { reservePricePaise: reserve } : {}),
    ...(buyNow !== undefined ? { buyNowPricePaise: buyNow } : {}),
    ...(estLow !== undefined && estHigh !== undefined ? { estimateLowPaise: estLow, estimateHighPaise: estHigh } : {}),
  };

  return {
    index,
    title,
    category,
    startingBidPaise: starting ?? null,
    imageNames,
    errors,
    draft: errors.length ? null : draft,
    startAt,
    durationHours: Number.isFinite(durationHours) ? durationHours : 0,
  };
}

export function mapRows(rows: Record<string, string>[], now: Date): BulkRow[] {
  return rows.map((r, i) => mapRow(r, i, now));
}

/** Lower-cased file name -> File (the first wins on duplicates). */
export function indexFiles(files: File[]): Map<string, File> {
  const map = new Map<string, File>();
  for (const f of files) {
    const k = f.name.toLowerCase();
    if (!map.has(k)) map.set(k, f);
  }
  return map;
}

/** Image names of a row that have no selected file (case-insensitive). */
export function missingImages(row: BulkRow, files: Map<string, File>): string[] {
  return row.imageNames.filter((n) => !files.has(n.toLowerCase()));
}

/** All errors of a row for display: the CSV ones plus any unmatched image names. */
export function rowErrors(row: BulkRow, files: Map<string, File>): RowError[] {
  const missing = missingImages(row, files);
  return missing.length ? [...row.errors, { field: 'images', message: `No selected file named ${missing.join(', ')}.` }] : row.errors;
}

/** The unique image files the batch needs, in first-use order. */
export function filesToUpload(rows: BulkRow[], files: Map<string, File>): File[] {
  const seen = new Set<string>();
  const out: File[] = [];
  for (const row of rows) {
    for (const n of row.imageNames) {
      const k = n.toLowerCase();
      const f = files.get(k);
      if (f && !seen.has(k)) {
        seen.add(k);
        out.push(f);
      }
    }
  }
  return out;
}

/** Build the API item once images are uploaded (`urls`: lower-cased file name -> URL). "now" starts at `now`. */
export function toPayload(row: BulkRow, urls: Map<string, string>, now: Date): BulkItemPayload {
  if (!row.draft) throw new Error(`Row ${row.index + 1} is not valid.`);
  const start = row.startAt ?? now;
  const end = new Date(start.getTime() + row.durationHours * 3_600_000);
  return {
    ...row.draft,
    images: row.imageNames.map((n) => urls.get(n.toLowerCase()) as string),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}
