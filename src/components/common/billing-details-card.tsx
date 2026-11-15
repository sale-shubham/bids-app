'use client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormInput } from '@/components/common/form-input';
import { useAuthStore } from '@/store/auth-store';
import { useUpdateMe } from '@/features/members/use-members';
import { billingSchema, type BillingFormValues } from '@/features/members/members.schema';
import { memberErrorMessage } from '@/features/members/members.errors';
import { GST_STATES } from '@/lib/gst';

const NONE = 'none';

// Optional GSTIN + billing state, printed on GST invoices. Both can be left empty.
export function BillingDetailsCard() {
  const member = useAuthStore((s) => s.member);
  const update = useUpdateMe();
  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    values: { gstin: member?.gstin ?? '', billingState: member?.billingState ?? '' },
  });
  if (!member) return null;
  const { errors, isDirty } = form.formState;

  // Emptied fields are sent as null only if they had a value (so they can be cleared).
  const clearable = (next: string, prev: string | null | undefined) => (next ? next : prev ? null : undefined);

  const onSubmit = (v: BillingFormValues) =>
    update.mutate(
      { gstin: clearable(v.gstin, member.gstin), billingState: clearable(v.billingState, member.billingState) },
      {
        onSuccess: () => toast.success('Billing details saved'),
        onError: (e) => toast.error(memberErrorMessage(e, 'Could not save your billing details')),
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Billing details</CardTitle>
        <CardDescription>Optional. Add your GSTIN and state to get GST tax invoices for NobleBid fees.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormInput
            label="GSTIN"
            autoComplete="off"
            maxLength={15}
            hint="15 characters, e.g. 29ABCDE1234F1Z5."
            error={errors.gstin?.message}
            {...form.register('gstin')}
          />
          <div className="space-y-1.5">
            <Label htmlFor="billing-state">Billing state</Label>
            <Controller
              control={form.control}
              name="billingState"
              render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? '' : v)}>
                  <SelectTrigger id="billing-state" aria-invalid={!!errors.billingState}>
                    <SelectValue placeholder="Choose a state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not set</SelectItem>
                    {GST_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.billingState && <p className="text-xs text-destructive">{errors.billingState.message}</p>}
          </div>
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Save billing details
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
