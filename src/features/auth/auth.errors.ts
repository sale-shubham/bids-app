import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

// Friendly copy for the error `code`s bids-api emits on auth routes. Anything
// else falls back to the server's own message.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  INVALID_CURRENT_PASSWORD: 'Your current password is incorrect.',
  EMAIL_TAKEN: 'An account with this email already exists. Try logging in instead.',
  EMAIL_NOT_VERIFIED: 'Please verify your email to continue.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Contact support for help.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait a moment and try again.',
};

export function authErrorMessage(err: unknown, fallback?: string) {
  const code = apiErrorCode(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
