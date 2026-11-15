import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

// Friendly copy for error codes on the question routes.
const MESSAGES: Record<string, string> = {
  QUESTION_NOT_ALLOWED: 'You cannot ask a question on this auction.',
  ALREADY_ANSWERED: 'This question has already been answered.',
  TOO_MANY_REQUESTS: 'You have asked too many questions. Please try again later.',
  RATE_LIMITED: 'You have asked too many questions. Please try again later.',
};

export function questionErrorMessage(err: unknown, fallback?: string) {
  const code = apiErrorCode(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
