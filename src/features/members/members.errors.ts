import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

const MESSAGES: Record<string, string> = {
  INVALID_GSTIN: 'That GSTIN is not valid. Check the 15 characters and that it matches your billing state.',
};

export function memberErrorMessage(err: unknown, fallback = 'Could not update your profile') {
  const code = apiErrorCode(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
