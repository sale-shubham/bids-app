export const REPORT_TARGET_TYPES = ['AUCTION', 'MEMBER', 'REVIEW', 'QUESTION'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = ['COUNTERFEIT', 'PROHIBITED', 'MISLEADING', 'SPAM', 'ABUSE', 'OTHER'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportStatus = 'OPEN' | 'ACTION_TAKEN' | 'DISMISSED';
export type ReportPriority = 'HIGH' | 'NORMAL';

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

/** `GET /admin/reports` item. */
export interface AdminReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  note: string | null;
  reporter: { id: string; name: string; email: string };
  target: { label: string; url: string | null };
  openCountForTarget: number;
  priority: ReportPriority;
}

export interface AdminReportFilters {
  /** 'open' | 'resolved'. */
  tab: string;
  /** '' = any target type. */
  targetType: string;
  /** Resolved tab only: which outcome to list. */
  outcome: 'ACTION_TAKEN' | 'DISMISSED';
}

export interface ResolveReportInput {
  id: string;
  status: Exclude<ReportStatus, 'OPEN'>;
  note?: string;
  applyToAllOpenForTarget?: boolean;
}
