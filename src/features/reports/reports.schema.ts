import { z } from '@/lib/zod';
import { REPORT_DETAILS_MAX, REPORT_NOTE_MAX } from './reports.constants';
import { REPORT_REASONS, type ReportInput, type ReportTargetType } from './reports.types';

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS, { message: 'Choose a reason' }),
  details: z.string().trim().max(REPORT_DETAILS_MAX, `At most ${REPORT_DETAILS_MAX} characters`),
});
export type ReportFormValues = z.infer<typeof reportSchema>;

/** Form values -> request body (empty details are omitted). */
export function toReportPayload(targetType: ReportTargetType, targetId: string, v: ReportFormValues): ReportInput {
  return { targetType, targetId, reason: v.reason, ...(v.details ? { details: v.details } : {}) };
}

export const resolveReportSchema = z.object({
  note: z.string().trim().max(REPORT_NOTE_MAX, `At most ${REPORT_NOTE_MAX} characters`),
  applyToAll: z.boolean(),
});
export type ResolveReportFormValues = z.infer<typeof resolveReportSchema>;
