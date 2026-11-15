import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

const MESSAGES: Record<string, string> = {
  PAYOUT_ACCOUNT_EXISTS: 'You already have a payout account. Refresh the page to see its status.',
  PAYOUT_ACCOUNT_REQUIRED: 'Set up your payout account before creating an auction.',
  PAYOUT_ACCOUNT_INACTIVE: 'Your payout account is not active yet.',
};

export function payoutErrorMessage(err: unknown, fallback = 'Could not save your payout details') {
  const code = apiErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return apiErrorMessage(err, fallback);
}
