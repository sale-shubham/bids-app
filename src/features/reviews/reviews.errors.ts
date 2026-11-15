import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

// Friendly copy for error codes on the review routes.
const MESSAGES: Record<string, string> = {
  REVIEW_NOT_ALLOWED: 'Only the winner of an ended auction can rate its seller.',
  ALREADY_REVIEWED: 'You have already rated the seller for this auction.',
  ALREADY_REPLIED: 'You have already replied to this review.',
};

export function reviewErrorMessage(err: unknown, fallback?: string) {
  const code = apiErrorCode(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
