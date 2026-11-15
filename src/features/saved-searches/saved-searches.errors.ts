import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

// Friendly copy for error codes on the saved-search routes.
const MESSAGES: Record<string, string> = {
  SAVED_SEARCH_LIMIT: 'You can keep at most 10 saved searches. Delete one under Profile > Alerts first.',
};

export function savedSearchErrorMessage(err: unknown, fallback?: string) {
  const code = apiErrorCode(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
