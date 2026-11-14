import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

const MESSAGES: Record<string, string> = {
  COMMISSION_NOT_FOUND: 'This commission no longer exists.',
  COMMISSION_NOT_DUE: 'This commission has already been settled.',
  ORDER_NOT_FOUND: 'We could not find this payment order. Please try again.',
  INVALID_SIGNATURE: 'We could not verify the payment. If money was deducted, it will be confirmed shortly.',
  PAYMENT_NOT_CAPTURED: 'Your payment has not been captured yet. It will be confirmed shortly.',
  AMOUNT_MISMATCH: 'The amount paid does not match the commission. Please contact support.',
};

export function commissionErrorMessage(err: unknown, fallback = 'Could not process the payment') {
  const code = apiErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return apiErrorMessage(err, fallback);
}
