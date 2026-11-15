import type { RiskReason } from './risk.types';

export const RISK_REASON_LABEL: Record<RiskReason, string> = {
  SHARED_DEVICE: 'Bidder and seller share a device',
  SHARED_IP: 'Bidder and seller share an IP address',
  NEW_ACCOUNT_SINGLE_SELLER: 'New account that only bids on one seller',
  CONCENTRATION: 'Most bids go to this one seller',
  NEVER_WINS: 'Bids often but never wins',
};

export function riskReasonLabel(reason: string) {
  return (RISK_REASON_LABEL as Record<string, string>)[reason] ?? reason.replace(/_/g, ' ').toLowerCase();
}

/** Score colour: 80+ high (destructive), 50+ medium (warning, the flag threshold), below that low. */
export function riskScoreVariant(score: number): 'destructive' | 'warning' | 'secondary' {
  if (score >= 80) return 'destructive';
  if (score >= 50) return 'warning';
  return 'secondary';
}
