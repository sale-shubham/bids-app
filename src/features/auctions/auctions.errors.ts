import { apiErrorCode, apiErrorDetails, apiErrorMessage } from '@/lib/api-client';
import { priceTooHighMessage } from '@/features/settings/settings.utils';

// Friendly copy for error codes on the auctions routes.
const MESSAGES: Record<string, string> = {
  AUCTION_NOT_FOUND: 'This auction no longer exists.',
  AUCTION_HAS_BIDS: 'This auction already has bids, so it can no longer be changed or deleted.',
  AUCTION_ENDED: 'This auction has already ended.',
  AUCTION_NOT_REPUBLISHABLE: 'Only ended auctions with no bids can be republished.',
  COMMISSION_UNPAID: 'Pay your outstanding commission before creating a new auction.',
  PAYOUT_ACCOUNT_REQUIRED: 'Set up your payout account before creating an auction.',
  INVALID_RESERVE: 'The reserve price must be at least the starting bid and within the platform maximum.',
  INVALID_BUY_NOW: 'The Buy It Now price must be above the starting bid, at least the reserve, and within the platform maximum.',
  INVALID_CATEGORY: 'Choose an active category for this item.',
  INVALID_ATTRIBUTES: 'Some item details are missing or invalid for this category. Check the highlighted fields.',
  INVALID_ESTIMATE: 'The estimate needs both a low and a high value (at least ₹1), with low not above high.',
  INVALID_SHIPPING: 'Offer pickup, courier, or both. Pickup needs a city.',
  FORBIDDEN: 'You do not have permission to do that.',
};

export function auctionErrorMessage(err: unknown, fallback?: string) {
  const code = apiErrorCode(err);
  if (code === 'PRICE_TOO_HIGH') return priceTooHighMessage(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}

/**
 * Per-field messages of an `INVALID_ATTRIBUTES` error (`details.fields`), as `{ attributeKey: message }`.
 * Accepts a `{ key: message }` map or a `[{ key, message }]` list; anything else gives `{}`.
 */
export function attributeFieldErrors(err: unknown): Record<string, string> {
  if (apiErrorCode(err) !== 'INVALID_ATTRIBUTES') return {};
  const fields = (apiErrorDetails(err) as { fields?: unknown } | undefined)?.fields;
  const out: Record<string, string> = {};
  if (Array.isArray(fields)) {
    for (const f of fields) {
      if (typeof f === 'object' && f !== null && typeof (f as { key?: unknown }).key === 'string') {
        out[(f as { key: string }).key] = String((f as { message?: unknown }).message ?? 'Invalid value');
      }
    }
  } else if (typeof fields === 'object' && fields !== null) {
    for (const [k, v] of Object.entries(fields)) out[k] = typeof v === 'string' ? v : 'Invalid value';
  }
  return out;
}
