import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

// Friendly copy for error codes on the follow routes.
const MESSAGES: Record<string, string> = {
  INVALID_FOLLOW: 'You cannot follow yourself.',
  SELLER_NOT_FOUND: 'This seller no longer exists.',
};

export function followErrorMessage(err: unknown, fallback?: string) {
  const code = apiErrorCode(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
