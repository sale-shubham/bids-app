import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';
import { commissionErrorMessage } from '@/features/commissions/commissions.errors';

const MESSAGES: Record<string, string> = {
  SALE_NOT_FOUND: 'This sale no longer exists.',
  SALE_NOT_PAYABLE: 'This purchase can no longer be paid. The payment window may have closed.',
  PAYOUT_ACCOUNT_INACTIVE: 'The seller cannot receive payments yet. Please try again later.',
  SALE_INVALID_STATE: 'This sale has changed since you opened it. Refreshing.',
};

export function saleErrorMessage(err: unknown, fallback = 'Something went wrong') {
  const code = apiErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return apiErrorMessage(err, fallback);
}

/** Payment errors: sale codes first, then the shared Razorpay / verify codes. */
export function salePaymentErrorMessage(err: unknown) {
  const code = apiErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return commissionErrorMessage(err);
}

/** Codes that mean the cached sale is stale and should be refetched. */
export function isStaleSaleError(err: unknown) {
  const code = apiErrorCode(err);
  return code === 'SALE_INVALID_STATE' || code === 'SALE_NOT_PAYABLE' || code === 'SALE_NOT_FOUND';
}
