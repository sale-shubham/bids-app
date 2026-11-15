export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export const OFFER_STATUSES: OfferStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'];

/** A second-chance offer: the seller offers a cancelled sale's item to the runner-up at their maximum bid. */
export interface OfferDTO {
  id: string;
  auctionId: string;
  auction: { id: string; title: string; coverImage: string | null };
  amountPaise: number;
  status: OfferStatus;
  expiresAt: string;
  respondedAt: string | null;
  /** The AWAITING_PAYMENT sale created when the offer was accepted. */
  newSaleId: string | null;
  createdAt: string;
}
