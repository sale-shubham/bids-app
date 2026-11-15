import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

// Friendly copy for error codes on the report routes.
const MESSAGES: Record<string, string> = {
  REPORT_TARGET_NOT_FOUND: 'That item is no longer available, so it cannot be reported.',
  INVALID_REPORT: 'You cannot report this item.',
  ALREADY_REPORTED: 'You have already reported this. Our team will review it.',
  REPORT_ALREADY_RESOLVED: 'Another admin already resolved this report.',
  TOO_MANY_REQUESTS: 'You have sent too many reports. Please try again later.',
  RATE_LIMITED: 'You have sent too many reports. Please try again later.',
};

export function reportErrorMessage(err: unknown, fallback?: string) {
  const code = apiErrorCode(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
