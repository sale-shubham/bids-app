import { z } from '@/lib/zod';
import { formatINR } from '@/lib/utils';
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

/** Platform maximum price bounds (rupees): ₹1,000 .. ₹1,000 crore (matches bids-api). */
export const MAX_PRICE_MIN_RUPEES = 1_000;
export const MAX_PRICE_MAX_RUPEES = 10_000_000_000;

const priceField = (label: string) =>
  numeric(label)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'At most 2 decimal places')
    .refine((v) => Number(v) >= 1, 'Must be at least ₹1')
    .refine((v) => Number(v) <= MAX_PRICE_MAX_RUPEES, `Must be at most ${formatINR(MAX_PRICE_MAX_RUPEES * 100)}`);

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
  maxPriceRupees: numeric('Maximum price')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'At most 2 decimal places')
    .refine((v) => Number(v) >= MAX_PRICE_MIN_RUPEES, `Must be at least ${formatINR(MAX_PRICE_MIN_RUPEES * 100)}`)
    .refine((v) => Number(v) <= MAX_PRICE_MAX_RUPEES, `Must be at most ${formatINR(MAX_PRICE_MAX_RUPEES * 100)}`),
  depositThresholdRupees: numeric('Deposit threshold')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'At most 2 decimal places')
    .refine((v) => Number(v) <= MAX_PRICE_MAX_RUPEES, `Must be at most ${formatINR(MAX_PRICE_MAX_RUPEES * 100)}`),
  depositRatePercent: numeric('Deposit rate')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'At most 2 decimal places')
    .refine((v) => Number(v) >= 1 && Number(v) <= 50, 'Must be between 1% and 50%'),
  checkoutMode: z.enum(['off', 'optional', 'required'], { message: 'Choose a checkout mode' }),
  featuredEnabled: z.boolean(),
  featuredPrice1: priceField('1-day price'),
  featuredPrice3: priceField('3-day price'),
  featuredPrice7: priceField('7-day price'),
});

export type MarketplaceValues = z.infer<typeof marketplaceSchema>;

export function settingsToForm(s: AdminSettings): MarketplaceValues {
  return {
    commissionPercent: bpsToPercent(s.commissionRateBps),
    minIncrementRupees: paiseToRupeesStr(s.minIncrementPaise),
    antiSnipingMinutes: String(s.antiSnipingMinutes),
    maxPriceRupees: paiseToRupeesStr(s.maxPricePaise),
    depositThresholdRupees: paiseToRupeesStr(s.depositThresholdPaise),
    depositRatePercent: bpsToPercent(s.depositRateBps),
    checkoutMode: s.checkoutMode,
    featuredEnabled: s.featuredEnabled ?? false,
    featuredPrice1: paiseToRupeesStr(s.featuredPrices?.['1'] || 9900),
    featuredPrice3: paiseToRupeesStr(s.featuredPrices?.['3'] || 24900),
    featuredPrice7: paiseToRupeesStr(s.featuredPrices?.['7'] || 49900),
  };
}

export function formToSettings(v: MarketplaceValues): AdminSettings {
  return {
    commissionRateBps: percentToBps(v.commissionPercent),
    minIncrementPaise: rupeesToPaiseNum(v.minIncrementRupees),
    antiSnipingMinutes: Number(v.antiSnipingMinutes),
    maxPricePaise: rupeesToPaiseNum(v.maxPriceRupees),
    depositThresholdPaise: rupeesToPaiseNum(v.depositThresholdRupees),
    depositRateBps: percentToBps(v.depositRatePercent),
    checkoutMode: v.checkoutMode,
    featuredEnabled: v.featuredEnabled,
    featuredPrices: {
      '1': rupeesToPaiseNum(v.featuredPrice1),
      '3': rupeesToPaiseNum(v.featuredPrice3),
      '7': rupeesToPaiseNum(v.featuredPrice7),
    },
  };
}
