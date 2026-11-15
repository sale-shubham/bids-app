'use client';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorCode } from '@/lib/api-client';
import { REPORT_DETAILS_MAX, REPORT_REASON_LABEL } from '../reports.constants';
import { reportErrorMessage } from '../reports.errors';
import { reportSchema, toReportPayload, type ReportFormValues } from '../reports.schema';
import { REPORT_REASONS, type ReportTargetType } from '../reports.types';
import { useCreateReport } from '../use-reports';

interface ReportDialogProps {
  targetType: ReportTargetType;
  targetId: string;
  /** What is being reported, e.g. "this auction" (used in the description). */
  subject: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "Report": a reason (plain-language radio list) plus optional details. */
export function ReportDialog({ targetType, targetId, subject, open, onOpenChange }: ReportDialogProps) {
  const create = useCreateReport();
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: undefined, details: '' },
  });
  const { errors } = form.formState;

  React.useEffect(() => {
    if (!open) form.reset({ reason: undefined, details: '' });
  }, [open, form]);

  const onSubmit = (values: ReportFormValues) =>
    create.mutate(toReportPayload(targetType, targetId, values), {
      onSuccess: () => {
        toast.success('Thanks — our team will review this.');
        onOpenChange(false);
      },
      onError: (e) => {
        toast.error(reportErrorMessage(e, 'Could not send your report'));
        const code = apiErrorCode(e);
        if (code === 'ALREADY_REPORTED' || code === 'REPORT_TARGET_NOT_FOUND' || code === 'INVALID_REPORT') onOpenChange(false);
      },
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {subject}</DialogTitle>
          <DialogDescription>Tell us what is wrong. Reports are private and reviewed by our team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label id="report-reason-label">Reason</Label>
            <Controller
              control={form.control}
              name="reason"
              render={({ field }) => (
                <div role="radiogroup" aria-labelledby="report-reason-label" className="space-y-1.5">
                  {REPORT_REASONS.map((r) => (
                    <label key={r} className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm has-checked:border-primary has-checked:bg-primary/5">
                      <input
                        type="radio"
                        name="report-reason"
                        value={r}
                        checked={field.value === r}
                        onChange={() => field.onChange(r)}
                        disabled={create.isPending}
                        className="accent-primary"
                      />
                      {REPORT_REASON_LABEL[r]}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              rows={3}
              maxLength={REPORT_DETAILS_MAX}
              placeholder="Anything that helps us look into it"
              aria-invalid={!!errors.details}
              {...form.register('details')}
            />
            {errors.details && <p className="text-xs text-destructive">{errors.details.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Send report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
