export type PayoutStatus = 'PENDING' | 'NEEDS_CLARIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
export type BusinessType = 'individual' | 'proprietorship';

/** What the API returns about the seller's payout (linked) account. The full account number is never returned. */
export interface PayoutAccount {
  status: PayoutStatus;
  statusReason: string | null;
  legalName: string;
  businessType: BusinessType | null;
  bankLast4: string | null;
  ifsc: string | null;
  beneficiaryName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PayoutAccountInput {
  legalName: string;
  businessType: BusinessType;
  phone: string;
  pan: string;
  accountNumber: string;
  ifsc: string;
  beneficiaryName: string;
  address: { street1: string; city: string; state: string; postalCode: string };
}

export const PAYOUT_STATUSES: PayoutStatus[] = ['PENDING', 'NEEDS_CLARIFICATION', 'ACTIVE', 'SUSPENDED', 'REJECTED'];
