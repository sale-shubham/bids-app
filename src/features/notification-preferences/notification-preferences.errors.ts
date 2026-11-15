import { apiErrorMessage } from '@/lib/api-client';

// No route-specific error codes any more; the shared mapping covers everything.
export function preferenceErrorMessage(err: unknown, fallback?: string) {
  return apiErrorMessage(err, fallback);
}
