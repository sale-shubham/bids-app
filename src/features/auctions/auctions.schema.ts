import { z } from '@/lib/zod';
import { DEFAULT_MAX_PRICE_PAISE } from '@/features/settings/settings.utils';
import { formatINR } from '@/lib/utils';
import { attributeErrors, attributesToPayload, specsToValues } from '@/features/categories/categories.schema';
import type { AttributeDef } from '@/features/categories/categories.types';
import { CONDITIONS, type AuctionCondition, type AuctionDetail, type AuctionWritePayload } from './auctions.types';

// Mirrors bids-api's create/update rules. Rupee inputs are strings in the form
// and converted to paise by `toWritePayload`.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const DURATION_PRESETS = [
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
  { value: 'custom', label: 'Custom' },
] as const;

export function rupeesToPaise(v: string): number {
  return Math.round(Number(v) * 100);
}

export function paiseToRupees(paise: number): string {
  return String(paise / 100);
}

// `min`/`max` are in PAISE; the input is a rupee string.
const tooHigh = (label: string, max: number) => `${label} can be at most ${formatINR(max)}`;
const money = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== '' && Number.isFinite(Number(v)), `${label} is required`)
    .refine((v) => !Number.isFinite(Number(v)) || Number(v) * 100 >= min, `${label} must be at least ₹${min / 100}`)
    .refine((v) => !Number.isFinite(Number(v)) || Math.round(Number(v) * 100) <= max, tooHigh(label, max));

/** Optional rupee amount: empty is fine, otherwise a positive number within the platform maximum. */
const optionalMoney = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) > 0), `${label} must be a positive amount`)
    .refine((v) => v === '' || !Number.isFinite(Number(v)) || Math.round(Number(v) * 100) <= max, tooHigh(label, max));

/** Rich-text HTML with no visible text (Quill's empty `<p><br></p>`) counts as empty. */
export const isBlankHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';

/** Combine "YYYY-MM-DD" + "HH:mm" (local time) into a Date; null when incomplete. */
export function combineDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface AuctionFormValues {
  title: string;
  description: string;
  /** Category node id (leaf or any level). */
  categoryId: string;
  /** Category attribute values as strings, keyed by attribute key. */
  attributes: Record<string, string>;
  condition: AuctionCondition;
  /** Optional pre-auction estimate range (rupees); both or neither. */
  estimateLow: string;
  estimateHigh: string;
  /** Optional rich-text condition report (HTML). */
  conditionReport: string;
  pickup: boolean;
  pickupCity: string;
  courier: boolean;
  /** Courier fee in rupees; empty = free. */
  shippingFee: string;
  shipsWithinDays: string;
  images: string[];
  /** Uploaded listing video URL, or null. */
  videoUrl: string | null;
  startingBid: string;
  minIncrement: string;
  /** Optional hidden reserve (rupees); empty = none. */
  reservePrice: string;
  /** Optional Buy It Now price (rupees); empty = none. */
  buyNowPrice: string;
  startNow: boolean;
  startDate: string;
  startTime: string;
  duration: '1' | '3' | '7' | 'custom';
  endDate: string;
  endTime: string;
}

/** Resolved start/end of the form values (start "now" is read at call time). */
export function resolveWindow(v: Pick<AuctionFormValues, 'startNow' | 'startDate' | 'startTime' | 'duration' | 'endDate' | 'endTime'>) {
  const start = v.startNow ? new Date() : combineDateTime(v.startDate, v.startTime);
  if (!start) return { start: null, end: null };
  const end = v.duration === 'custom' ? combineDateTime(v.endDate, v.endTime) : new Date(start.getTime() + Number(v.duration) * DAY);
  return { start, end };
}

/**
 * `originalStart`: when editing, an unchanged start time (even if already in the
 * past because the auction is live) is allowed.
 * `maxPricePaise`: platform maximum price (public settings); caps the starting
 * bid and the minimum increment.
 */
export function makeAuctionFormSchema(
  originalStart?: string,
  maxPricePaise: number = DEFAULT_MAX_PRICE_PAISE,
  /** Attribute definitions of the chosen category; their values are validated too. */
  attributeDefs: AttributeDef[] = [],
) {
  return z
    .object({
      title: z.string().trim().min(5, 'At least 5 characters').max(120, 'At most 120 characters'),
      description: z
        .string()
        .refine((v) => v.length >= 20, 'Describe the item (at least 20 characters)')
        .refine((v) => v.length <= 10000, 'Description is too long (max 10,000 characters)')
        .refine((v) => v.replace(/<[^>]*>/g, '').trim().length >= 10, 'Describe the item (at least 20 characters)'),
      categoryId: z.string().trim().min(1, 'Choose a category'),
      attributes: z.record(z.string(), z.string()),
      condition: z.enum(CONDITIONS.map((c) => c.value) as [AuctionCondition, ...AuctionCondition[]], { error: 'Choose a condition' }),
      estimateLow: optionalMoney('Low estimate', maxPricePaise),
      estimateHigh: optionalMoney('High estimate', maxPricePaise),
      conditionReport: z.string().refine((v) => v.length <= 5000, 'Condition report is too long (max 5,000 characters)'),
      pickup: z.boolean(),
      pickupCity: z.string().trim().max(80, 'At most 80 characters'),
      courier: z.boolean(),
      shippingFee: z
        .string()
        .trim()
        .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), 'Shipping fee must be 0 or more')
        .refine((v) => v === '' || !Number.isFinite(Number(v)) || Math.round(Number(v) * 100) <= maxPricePaise, tooHigh('Shipping fee', maxPricePaise)),
      shipsWithinDays: z
        .string()
        .trim()
        .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 30), 'Whole days from 1 to 30'),
      images: z.array(z.string()).min(1, 'Add at least one image').max(8, 'At most 8 images'),
      videoUrl: z.string().nullable(),
      startingBid: money(100, maxPricePaise, 'Starting bid'),
      minIncrement: z
        .string()
        .trim()
        .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) * 100 >= 100), 'Minimum increment is ₹1')
        .refine((v) => v === '' || !Number.isFinite(Number(v)) || Math.round(Number(v) * 100) <= maxPricePaise, tooHigh('Minimum increment', maxPricePaise)),
      reservePrice: optionalMoney('Reserve price', maxPricePaise),
      buyNowPrice: optionalMoney('Buy It Now price', maxPricePaise),
      startNow: z.boolean(),
      startDate: z.string(),
      startTime: z.string(),
      duration: z.enum(['1', '3', '7', 'custom']),
      endDate: z.string(),
      endTime: z.string(),
    })
    .superRefine((v, ctx) => {
      // Reserve / Buy It Now rules (mirror the API). Skipped while an input is not a number yet.
      const num = (s: string) => (s.trim() !== '' && Number.isFinite(Number(s)) ? Math.round(Number(s) * 100) : null);
      const starting = num(v.startingBid);
      const reserve = num(v.reservePrice);
      const buyNow = num(v.buyNowPrice);
      if (starting !== null && reserve !== null && reserve < starting) {
        ctx.addIssue({ code: 'custom', path: ['reservePrice'], message: 'Reserve price must be at least the starting bid' });
      }
      if (starting !== null && buyNow !== null && buyNow <= starting) {
        ctx.addIssue({ code: 'custom', path: ['buyNowPrice'], message: 'Buy It Now price must be above the starting bid' });
      } else if (reserve !== null && buyNow !== null && buyNow < reserve) {
        ctx.addIssue({ code: 'custom', path: ['buyNowPrice'], message: 'Buy It Now price must be at least the reserve price' });
      }
      // Estimate: both or neither, at least ₹1, low <= high.
      const low = num(v.estimateLow);
      const high = num(v.estimateHigh);
      if ((low === null) !== (high === null)) {
        ctx.addIssue({ code: 'custom', path: [low === null ? 'estimateLow' : 'estimateHigh'], message: 'Enter both estimates, or leave both empty' });
      } else if (low !== null && high !== null) {
        if (low < 100) ctx.addIssue({ code: 'custom', path: ['estimateLow'], message: 'Low estimate must be at least ₹1' });
        if (high < 100) ctx.addIssue({ code: 'custom', path: ['estimateHigh'], message: 'High estimate must be at least ₹1' });
        else if (low > high) ctx.addIssue({ code: 'custom', path: ['estimateHigh'], message: 'High estimate must be at least the low estimate' });
      }
      // Delivery: at least one option; pickup needs a city.
      if (!v.pickup && !v.courier) ctx.addIssue({ code: 'custom', path: ['courier'], message: 'Offer pickup, courier, or both' });
      if (v.pickup && !v.pickupCity.trim()) ctx.addIssue({ code: 'custom', path: ['pickupCity'], message: 'Enter the pickup city' });
      // Category attributes.
      for (const [key, message] of Object.entries(attributeErrors(attributeDefs, v.attributes))) {
        ctx.addIssue({ code: 'custom', path: ['attributes', key], message });
      }
      if (!v.startNow && !combineDateTime(v.startDate, v.startTime)) {
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Choose a start date and time' });
        return;
      }
      if (v.duration === 'custom' && !combineDateTime(v.endDate, v.endTime)) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Choose an end date and time' });
        return;
      }
      const { start, end } = resolveWindow(v);
      if (!start || !end) return;
      const unchangedStart = !!originalStart && !v.startNow && Math.abs(start.getTime() - Date.parse(originalStart)) < 60_000;
      if (!v.startNow && !unchangedStart && start.getTime() < Date.now() - 2 * 60_000) {
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Start time cannot be in the past' });
      }
      const span = end.getTime() - start.getTime();
      if (span < HOUR) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Auction must run for at least 1 hour' });
      else if (span > 30 * DAY) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Auction can run for at most 30 days' });
    });
}

export function toWritePayload(v: AuctionFormValues, attributeDefs: AttributeDef[] = []): AuctionWritePayload {
  const { start, end } = resolveWindow(v);
  return {
    title: v.title.trim(),
    description: v.description,
    categoryId: v.categoryId,
    attributes: attributesToPayload(attributeDefs, v.attributes),
    condition: v.condition,
    images: v.images,
    videoUrl: v.videoUrl,
    startingBidPaise: rupeesToPaise(v.startingBid),
    ...(v.minIncrement.trim() ? { minIncrementPaise: rupeesToPaise(v.minIncrement) } : {}),
    // null = none / cleared (the API clears on update; `withoutNullPrices` drops them for create).
    reservePricePaise: v.reservePrice.trim() ? rupeesToPaise(v.reservePrice) : null,
    buyNowPricePaise: v.buyNowPrice.trim() ? rupeesToPaise(v.buyNowPrice) : null,
    estimateLowPaise: v.estimateLow.trim() && v.estimateHigh.trim() ? rupeesToPaise(v.estimateLow) : null,
    estimateHighPaise: v.estimateLow.trim() && v.estimateHigh.trim() ? rupeesToPaise(v.estimateHigh) : null,
    conditionReport: isBlankHtml(v.conditionReport) ? '' : v.conditionReport,
    shippingOptions: {
      pickup: v.pickup,
      ...(v.pickup ? { pickupCity: v.pickupCity.trim() } : {}),
      courier: v.courier,
      ...(v.courier ? { shippingFeePaise: v.shippingFee.trim() ? rupeesToPaise(v.shippingFee) : 0 } : {}),
      ...(v.courier && v.shipsWithinDays.trim() ? { shipsWithinDays: Number(v.shipsWithinDays) } : {}),
    },
    startTime: (start ?? new Date()).toISOString(),
    endTime: (end ?? new Date()).toISOString(),
  };
}

/** Create payload: leave out reserve / Buy It Now when they were not set. */
export function withoutNullPrices(p: AuctionWritePayload): AuctionWritePayload {
  const { reservePricePaise, buyNowPricePaise, estimateLowPaise, estimateHighPaise, conditionReport, ...rest } = p;
  return {
    ...rest,
    ...(estimateLowPaise != null && estimateHighPaise != null ? { estimateLowPaise, estimateHighPaise } : {}),
    ...(conditionReport ? { conditionReport } : {}),
    ...(reservePricePaise != null ? { reservePricePaise } : {}),
    ...(buyNowPricePaise != null ? { buyNowPricePaise } : {}),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function defaultFormValues(a?: AuctionDetail): AuctionFormValues {
  if (!a) {
    return {
      title: '',
      description: '',
      categoryId: '',
      attributes: {},
      condition: 'NEW',
      estimateLow: '',
      estimateHigh: '',
      conditionReport: '',
      pickup: false,
      pickupCity: '',
      courier: true,
      shippingFee: '',
      shipsWithinDays: '',
      images: [],
      videoUrl: null,
      startingBid: '',
      minIncrement: '',
      reservePrice: '',
      buyNowPrice: '',
      startNow: true,
      startDate: '',
      startTime: '',
      duration: '7',
      endDate: '',
      endTime: '',
    };
  }
  const start = new Date(a.startTime);
  const end = new Date(a.endTime);
  return {
    title: a.title,
    description: a.description,
    categoryId: a.categoryId ?? '',
    attributes: specsToValues(undefined, a.specs),
    condition: a.condition,
    estimateLow: typeof a.estimateLowPaise === 'number' ? paiseToRupees(a.estimateLowPaise) : '',
    estimateHigh: typeof a.estimateHighPaise === 'number' ? paiseToRupees(a.estimateHighPaise) : '',
    conditionReport: a.conditionReport ?? '',
    // Legacy listings have no delivery options: default to courier so the form validates.
    pickup: a.shippingOptions ? !!a.shippingOptions.pickup : false,
    pickupCity: a.shippingOptions?.pickupCity ?? '',
    courier: a.shippingOptions ? !!a.shippingOptions.courier : true,
    shippingFee: typeof a.shippingOptions?.shippingFeePaise === 'number' && a.shippingOptions.shippingFeePaise > 0 ? paiseToRupees(a.shippingOptions.shippingFeePaise) : '',
    shipsWithinDays: typeof a.shippingOptions?.shipsWithinDays === 'number' ? String(a.shippingOptions.shipsWithinDays) : '',
    images: a.images,
    videoUrl: a.videoUrl ?? null,
    startingBid: paiseToRupees(a.startingBidPaise),
    minIncrement: paiseToRupees(a.minIncrementPaise),
    reservePrice: typeof a.reservePricePaise === 'number' ? paiseToRupees(a.reservePricePaise) : '',
    buyNowPrice: typeof a.buyNowPricePaise === 'number' ? paiseToRupees(a.buyNowPricePaise) : '',
    startNow: false,
    startDate: toDateInput(start),
    startTime: toTimeInput(start),
    duration: 'custom',
    endDate: toDateInput(end),
    endTime: toTimeInput(end),
  };
}

/** Relist pre-fill: the item and pricing of an earlier auction, but fresh dates (start now, 7 days). */
export function relistFormValues(a: AuctionDetail): AuctionFormValues {
  const base = defaultFormValues();
  const old = defaultFormValues(a);
  return {
    ...base,
    title: old.title,
    description: old.description,
    categoryId: old.categoryId,
    attributes: old.attributes,
    condition: old.condition,
    estimateLow: old.estimateLow,
    estimateHigh: old.estimateHigh,
    conditionReport: old.conditionReport,
    pickup: old.pickup,
    pickupCity: old.pickupCity,
    courier: old.courier,
    shippingFee: old.shippingFee,
    shipsWithinDays: old.shipsWithinDays,
    images: old.images,
    videoUrl: old.videoUrl,
    startingBid: old.startingBid,
    minIncrement: old.minIncrement,
    reservePrice: old.reservePrice,
    buyNowPrice: old.buyNowPrice,
  };
}

// Republish dialog (ended auction, no bids).
export const republishSchema = z
  .object({ startDate: z.string().min(1, 'Choose a start date'), startTime: z.string().min(1, 'Choose a start time'), endDate: z.string().min(1, 'Choose an end date'), endTime: z.string().min(1, 'Choose an end time') })
  .superRefine((v, ctx) => {
    const s = combineDateTime(v.startDate, v.startTime);
    const e = combineDateTime(v.endDate, v.endTime);
    if (!s || !e) return;
    if (s.getTime() < Date.now() - 2 * 60_000) ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Start time cannot be in the past' });
    const span = e.getTime() - s.getTime();
    if (span < HOUR) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Auction must run for at least 1 hour' });
    else if (span > 30 * DAY) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Auction can run for at most 30 days' });
  });
export type RepublishValues = z.infer<typeof republishSchema>;
