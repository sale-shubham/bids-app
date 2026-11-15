import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';
import { commissionErrorMessage } from '@/features/commissions/commissions.errors';

const MESSAGES: Record<string, string> = {
  AUCTION_ENDED: 'This auction has already ended, so it can no longer be promoted.',
  FEATURE_DISABLED: 'Promotions are not available right now.',
  INSUFFICIENT_CREDITS: 'Your credit balance does not cover this promotion.',
  AUCTION_NOT_FOUND: 'This auction no longer exists.',
  FORBIDDEN: 'You can only promote your own auctions.',
};

/** Copy for the featured-listing endpoints; payment codes fall through to the shared payment copy. */
export function featuredErrorMessage(err: unknown, fallback = 'Could not promote this auction') {
  const code = apiErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return code ? commissionErrorMessage(err, fallback) : apiErrorMessage(err, fallback);
}
