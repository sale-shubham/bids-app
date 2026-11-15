import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

const MESSAGES: Record<string, string> = {
  OFFER_EXISTS: 'You already made a second-chance offer for this sale.',
  NO_RUNNER_UP: 'There is no other bidder to offer this item to.',
  OFFER_NOT_FOUND: 'This offer no longer exists.',
  OFFER_NOT_PENDING: 'This offer was already answered.',
  OFFER_EXPIRED: 'This offer has expired.',
  PAYOUT_ACCOUNT_INACTIVE: 'The seller cannot receive payments right now. Please try again later.',
  SALE_INVALID_STATE: 'This sale has changed since you opened it. Refreshing.',
};

export function offerErrorMessage(err: unknown, fallback = 'Something went wrong') {
  const code = apiErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return apiErrorMessage(err, fallback);
}

/** Codes that mean the cached offer / sale is stale and should be refetched. */
export function isStaleOfferError(err: unknown) {
  const code = apiErrorCode(err);
  return code === 'OFFER_NOT_PENDING' || code === 'OFFER_EXPIRED' || code === 'OFFER_NOT_FOUND' || code === 'OFFER_EXISTS' || code === 'SALE_INVALID_STATE';
}
