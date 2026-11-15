import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

// Friendly copy for error codes on the notification-preference routes.
const MESSAGES: Record<string, string> = {
  PHONE_NOT_VERIFIED: 'Verify your phone number in the Security tab to turn on WhatsApp alerts.',
};

export function preferenceErrorMessage(err: unknown, fallback?: string) {
  const code = apiErrorCode(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
