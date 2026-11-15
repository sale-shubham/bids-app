import { apiErrorCode, apiErrorDetails } from '@/lib/api-client';
import { commissionErrorMessage } from '@/features/commissions/commissions.errors';
import { formatINR } from '@/lib/utils';

export const DEPOSIT_MESSAGES: Record<string, string> = {
  DEPOSIT_ALREADY_HELD: 'Your deposit for this auction is already paid.',
  DEPOSIT_NOT_REQUIRED: 'No deposit is required to bid on this auction.',
};

/** `DEPOSIT_REQUIRED` copy (403, `details.depositPaise`). */
export function depositRequiredMessage(err: unknown) {
  const paise = apiErrorDetails(err)?.depositPaise;
  return typeof paise === 'number' && paise > 0
    ? `Pay the ${formatINR(paise)} refundable deposit to bid on this auction.`
    : 'Pay the refundable deposit to bid on this auction.';
}

/** Codes that mean the cached auction's `deposit` is stale: refetch it. */
export function isStaleDepositError(err: unknown) {
  const code = apiErrorCode(err);
  return code === 'DEPOSIT_REQUIRED' || code === 'DEPOSIT_ALREADY_HELD' || code === 'DEPOSIT_NOT_REQUIRED';
}

/** Deposit checkout / verify errors: deposit codes first, then the shared Razorpay codes. */
export function depositErrorMessage(err: unknown) {
  const code = apiErrorCode(err);
  if (code === 'DEPOSIT_REQUIRED') return depositRequiredMessage(err);
  if (code && DEPOSIT_MESSAGES[code]) return DEPOSIT_MESSAGES[code];
  return commissionErrorMessage(err);
}
