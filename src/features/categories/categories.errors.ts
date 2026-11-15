import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

const MESSAGES: Record<string, string> = {
  CATEGORY_CYCLE: 'A category cannot be moved under itself or one of its own subcategories.',
  CATEGORY_SLUG_TAKEN: 'That slug is already used by another category.',
  CATEGORY_IN_USE: 'This category has auctions or subcategories, so it cannot be deleted. Deactivate it instead.',
  CATEGORY_NOT_FOUND: 'This category no longer exists.',
};

export function categoryErrorMessage(err: unknown, fallback = 'Something went wrong') {
  const code = apiErrorCode(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
