import { z } from '@/lib/zod';
import type { AuctionDetail, AuctionWritePayload } from './auctions.types';

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

const money = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== '' && Number.isFinite(Number(v)), `${label} is required`)
    .refine((v) => !Number.isFinite(Number(v)) || Number(v) * 100 >= min, `${label} must be at least ₹${min / 100}`)
    .refine((v) => !Number.isFinite(Number(v)) || Number(v) * 100 <= max, `${label} is too large`);

/** Combine "YYYY-MM-DD" + "HH:mm" (local time) into a Date; null when incomplete. */
export function combineDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface AuctionFormValues {
  title: string;
  description: string;
  category: string;
  condition: 'NEW' | 'USED';
  images: string[];
  startingBid: string;
  minIncrement: string;
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
 */
export function makeAuctionFormSchema(originalStart?: string) {
  return z
    .object({
      title: z.string().trim().min(5, 'At least 5 characters').max(120, 'At most 120 characters'),
      description: z
        .string()
        .refine((v) => v.length >= 20, 'Describe the item (at least 20 characters)')
        .refine((v) => v.length <= 10000, 'Description is too long (max 10,000 characters)')
        .refine((v) => v.replace(/<[^>]*>/g, '').trim().length >= 10, 'Describe the item (at least 20 characters)'),
      category: z.string().trim().min(1, 'Choose a category').max(60),
      condition: z.enum(['NEW', 'USED'], { error: 'Choose a condition' }),
      images: z.array(z.string()).min(1, 'Add at least one image').max(8, 'At most 8 images'),
      startingBid: money(100, 2_000_000_000, 'Starting bid'),
      minIncrement: z
        .string()
        .trim()
        .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) * 100 >= 100), 'Minimum increment is ₹1'),
      startNow: z.boolean(),
      startDate: z.string(),
      startTime: z.string(),
      duration: z.enum(['1', '3', '7', 'custom']),
      endDate: z.string(),
      endTime: z.string(),
    })
    .superRefine((v, ctx) => {
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

export function toWritePayload(v: AuctionFormValues): AuctionWritePayload {
  const { start, end } = resolveWindow(v);
  return {
    title: v.title.trim(),
    description: v.description,
    category: v.category,
    condition: v.condition,
    images: v.images,
    startingBidPaise: rupeesToPaise(v.startingBid),
    ...(v.minIncrement.trim() ? { minIncrementPaise: rupeesToPaise(v.minIncrement) } : {}),
    startTime: (start ?? new Date()).toISOString(),
    endTime: (end ?? new Date()).toISOString(),
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
      category: '',
      condition: 'NEW',
      images: [],
      startingBid: '',
      minIncrement: '',
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
    category: a.category,
    condition: a.condition,
    images: a.images,
    startingBid: paiseToRupees(a.startingBidPaise),
    minIncrement: paiseToRupees(a.minIncrementPaise),
    startNow: false,
    startDate: toDateInput(start),
    startTime: toTimeInput(start),
    duration: 'custom',
    endDate: toDateInput(end),
    endTime: toTimeInput(end),
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
