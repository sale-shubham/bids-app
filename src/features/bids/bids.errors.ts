import { apiErrorCode, apiErrorDetails, apiErrorMessage } from '@/lib/api-client';
import { priceTooHighMessage } from '@/features/settings/settings.utils';
import { formatINR } from '@/lib/utils';
import { DEPOSIT_MESSAGES, depositRequiredMessage } from '@/features/deposits/deposits.errors';

// Friendly copy for POST /auctions/:id/bids failures.
const MESSAGES: Record<string, string> = {
  AUCTION_NOT_FOUND: 'This auction no longer exists.',
  AUCTION_NOT_STARTED: 'This auction has not started yet.',
  AUCTION_ENDED: 'This auction has ended, so bids are closed.',
  OWN_AUCTION: 'You cannot bid on your own auction.',
  ALREADY_HIGHEST: 'You are already the highest bidder.',
  BUY_NOW_UNAVAILABLE: 'Buy It Now is no longer available for this auction.',
  FORBIDDEN: 'Only bidder accounts can place bids.',
  ACCOUNT_SUSPENDED: 'Your account is suspended and cannot bid.',
  RATE_LIMITED: 'You are bidding too fast. Wait a moment and try again.',
  TOO_MANY_REQUESTS: 'You are bidding too fast. Wait a moment and try again.',
  ...DEPOSIT_MESSAGES,
};

/** Minimum bid (paise) the API reported with a BID_TOO_LOW error. */
export function minBidFromError(err: unknown): number | undefined {
  const v = apiErrorDetails(err)?.minBidPaise;
  return typeof v === 'number' ? v : undefined;
}

export function bidErrorMessage(err: unknown) {
  const code = apiErrorCode(err);
  if (code === 'BID_TOO_LOW') {
    const min = minBidFromError(err);
    return min !== undefined
      ? `Someone bid before you. The minimum bid is now ${formatINR(min)}.`
      : 'Your bid is too low. Check the minimum bid and try again.';
  }
  if (code === 'MAX_TOO_LOW') {
    const cur = apiErrorDetails(err)?.currentMaxPaise;
    return typeof cur === 'number' ? `Your new maximum must be higher than your current ${formatINR(cur)}.` : 'Your new maximum must be higher than your current maximum.';
  }
  if (code === 'PRICE_TOO_HIGH') return priceTooHighMessage(err);
  if (code === 'DEPOSIT_REQUIRED') return depositRequiredMessage(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return apiErrorMessage(err, 'Could not place your bid');
}

export function buyNowErrorMessage(err: unknown) {
  const code = apiErrorCode(err);
  if (code === 'DEPOSIT_REQUIRED') return depositRequiredMessage(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return apiErrorMessage(err, 'Could not complete the purchase');
}
