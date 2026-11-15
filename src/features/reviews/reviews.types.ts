export interface ReviewDTO {
  id: string;
  auctionId: string;
  auctionTitle: string;
  rating: number;
  comment: string | null;
  sellerReply: string | null;
  sellerRepliedAt: string | null;
  createdAt: string;
  /** Masked reviewer label, e.g. "R***h". */
  reviewerLabel: string;
}

/** Admin view of a review (`GET /admin/reviews`). */
export interface AdminReview extends ReviewDTO {
  hiddenAt: string | null;
  reviewer: { id: string; name: string; email: string };
  seller: { id: string; name: string };
}

export interface AdminReviewFilters {
  /** 'all' | 'visible' | 'hidden' (maps to the `hidden` query param). */
  visibility: string;
  q: string;
}
