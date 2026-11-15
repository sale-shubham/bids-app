export interface StrikeDTO {
  id: string;
  saleId: string | null;
  auction: { id: string; title: string } | null;
  reason: 'UNPAID';
  createdAt: string;
  expiresAt: string;
  removedAt: string | null;
  note: string | null;
  /** Not removed and not expired. */
  active: boolean;
}
