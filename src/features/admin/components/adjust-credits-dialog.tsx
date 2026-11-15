'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormInput } from '@/components/common/form-input';
import { z } from '@/lib/zod';
import { apiErrorMessage } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';
import type { AdminMember } from '../admin.types';
import { useAdjustCredits } from '../use-admin';

// Signed rupees: "250" adds credits, "-100" removes them. Sent as non-zero paise.
export const adjustCreditsSchema = z.object({
  amountRupees: z
    .string()
    .trim()
    .refine((v) => /^-?\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 250 or -100 (up to 2 decimals)')
    .refine((v) => Number(v) !== 0, 'The amount cannot be zero'),
  note: z.string().trim().min(3, 'Add a short note').max(200, 'At most 200 characters'),
});
export type AdjustCreditsValues = z.infer<typeof adjustCreditsSchema>;

/** Admin: add or remove credits for a member. The note shows in the member's credit history. */
export function AdjustCreditsDialog({ member, onClose }: { member: AdminMember | null; onClose: () => void }) {
  const adjust = useAdjustCredits();
  const form = useForm<AdjustCreditsValues>({ resolver: zodResolver(adjustCreditsSchema), defaultValues: { amountRupees: '', note: '' } });
  const { errors } = form.formState;

  const close = () => {
    form.reset();
    onClose();
  };

  const submit = form.handleSubmit((v) => {
    if (!member) return;
    adjust.mutate(
      { id: member.id, amountPaise: Math.round(Number(v.amountRupees) * 100), note: v.note },
      {
        onSuccess: () => {
          toast.success('Credits adjusted');
          close();
        },
        onError: (e) => toast.error(apiErrorMessage(e, 'Could not adjust credits')),
      },
    );
  });

  return (
    <ConfirmDialog
      open={!!member}
      onOpenChange={(o) => !o && close()}
      title="Adjust credits"
      description={member ? `${member.email} has ${formatINR(member.creditBalancePaise)} in credits. Use a negative amount to remove credits.` : undefined}
      confirmLabel="Apply"
      loading={adjust.isPending}
      onConfirm={() => void submit()}
    >
      <div className="space-y-3">
        <FormInput label="Amount (₹, + or -)" inputMode="decimal" error={errors.amountRupees?.message} {...form.register('amountRupees')} />
        <FormInput label="Note" error={errors.note?.message} {...form.register('note')} />
      </div>
    </ConfirmDialog>
  );
}
