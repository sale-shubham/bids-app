export type RiskReason = 'SHARED_DEVICE' | 'SHARED_IP' | 'NEW_ACCOUNT_SINGLE_SELLER' | 'CONCENTRATION' | 'NEVER_WINS';
export type RiskOutcome = 'DISMISSED' | 'ACTION_TAKEN';
export type RiskTab = 'open' | 'reviewed';

export interface RiskPerson {
  id: string;
  name: string;
  email: string;
}

/** `GET /admin/risk` item: a shill-bidding flag (a signal only; nothing is blocked automatically). */
export interface RiskSignal {
  id: string;
  auction: { id: string; title: string };
  bidder: RiskPerson;
  seller: RiskPerson;
  score: number;
  /** Known reasons are `RiskReason`; unknown strings pass through and render as-is. */
  reasons: string[];
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  outcome: RiskOutcome | null;
  note: string | null;
}

export interface ReviewRiskInput {
  id: string;
  outcome: RiskOutcome;
  note?: string;
}
