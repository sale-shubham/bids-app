import type { ReportReason, ReportTargetType } from './reports.types';

// Plain-language reasons shown to reporters (and as the admin's reason label).
export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  COUNTERFEIT: 'Fake or counterfeit item',
  PROHIBITED: 'Prohibited or illegal item',
  MISLEADING: 'Misleading or inaccurate listing',
  SPAM: 'Spam or scam',
  ABUSE: 'Abusive or harassing',
  OTHER: 'Something else',
};

export const REPORT_TARGET_LABEL: Record<ReportTargetType, string> = {
  AUCTION: 'Auction',
  MEMBER: 'Member',
  REVIEW: 'Review',
  QUESTION: 'Question',
};

export const REPORT_DETAILS_MAX = 1000;
