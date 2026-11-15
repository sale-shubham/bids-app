import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

const MESSAGES: Record<string, string> = {
  STRIKE_NOT_FOUND: 'This strike no longer exists.',
  STRIKE_ALREADY_REMOVED: 'This strike was already removed.',
};

export function strikeErrorMessage(err: unknown, fallback = 'Something went wrong') {
  const code = apiErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return apiErrorMessage(err, fallback);
}
