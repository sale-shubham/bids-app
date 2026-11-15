import { apiErrorDetails } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';

/** Platform maximum price (paise) used when the API does not report one (older API). ₹10 crore. */
export const DEFAULT_MAX_PRICE_PAISE = 10_000_000_000;

/** `maxPricePaise` from public settings, falling back to the default when absent or invalid. */
export function resolveMaxPricePaise(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : DEFAULT_MAX_PRICE_PAISE;
}

/** Message for the API's PRICE_TOO_HIGH error (`details.maxPaise`). */
export function priceTooHighMessage(err: unknown): string {
  const max = apiErrorDetails(err)?.maxPaise;
  return typeof max === 'number' ? `The price can be at most ${formatINR(max)}.` : 'That price is higher than the platform maximum.';
}
