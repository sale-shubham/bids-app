import { z } from '@/lib/zod';
import type { AdminSettings } from './admin.types';

// Form-side rules for /admin/settings; mirror bids-api. Commission is shown as a
// percentage (2 decimals) and sent as basis points; min increment is rupees <-> paise.

export const bpsToPercent = (bps: number) => (bps / 100).toFixed(2);
export const percentToBps = (pct: string) => Math.round(Number(pct) * 100);
export const paiseToRupeesStr = (paise: number) => String(paise / 100);
export const rupeesToPaiseNum = (r: string) => Math.round(Number(r) * 100);

const numeric = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== '' && Number.isFinite(Number(v)), `${label} is required`);

export const categoryNameSchema = z.string().trim().min(2, 'At least 2 characters').max(40, 'At most 40 characters');

export const marketplaceSchema = z.object({
  commissionPercent: numeric('Commission')
    .refine((v) => Number(v) >= 0 && Number(v) <= 30, 'Must be between 0% and 30%')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'At most 2 decimal places'),
  minIncrementRupees: numeric('Minimum increment')
    .refine((v) => Number(v) >= 1, 'Must be at least ₹1')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'At most 2 decimal places'),
  antiSnipingMinutes: numeric('Anti-sniping window')
    .refine((v) => Number.isInteger(Number(v)), 'Whole minutes only')
    .refine((v) => Number(v) >= 0 && Number(v) <= 30, 'Must be between 0 and 30 minutes'),
  categories: z
    .array(categoryNameSchema)
    .min(1, 'Add at least one category')
    .max(30, 'At most 30 categories')
    .refine((c) => new Set(c.map((x) => x.trim().toLowerCase())).size === c.length, 'Categories must be unique'),
});

export type MarketplaceValues = z.infer<typeof marketplaceSchema>;

export function settingsToForm(s: AdminSettings): MarketplaceValues {
  return {
    commissionPercent: bpsToPercent(s.commissionRateBps),
    minIncrementRupees: paiseToRupeesStr(s.minIncrementPaise),
    antiSnipingMinutes: String(s.antiSnipingMinutes),
    categories: s.categories,
  };
}

export function formToSettings(v: MarketplaceValues): AdminSettings {
  return {
    commissionRateBps: percentToBps(v.commissionPercent),
    minIncrementPaise: rupeesToPaiseNum(v.minIncrementRupees),
    antiSnipingMinutes: Number(v.antiSnipingMinutes),
    categories: v.categories.map((c) => c.trim()),
  };
}
