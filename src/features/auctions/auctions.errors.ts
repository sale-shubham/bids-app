import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';
import { priceTooHighMessage } from '@/features/settings/settings.utils';

// Friendly copy for error codes on the auctions routes.
const MESSAGES: Record<string, string> = {
  AUCTION_NOT_FOUND: 'This auction no longer exists.',
  AUCTION_HAS_BIDS: 'This auction already has bids, so it can no longer be changed or deleted.',
  AUCTION_ENDED: 'This auction has already ended.',
  AUCTION_NOT_REPUBLISHABLE: 'Only ended auctions with no bids can be republished.',
  COMMISSION_UNPAID: 'Pay your outstanding commission before creating a new auction.',
  FORBIDDEN: 'You do not have permission to do that.',
};

export function auctionErrorMessage(err: unknown, fallback?: string) {
  const code = apiErrorCode(err);
  if (code === 'PRICE_TOO_HIGH') return priceTooHighMessage(err);
  return (code && MESSAGES[code]) || apiErrorMessage(err, fallback);
}
