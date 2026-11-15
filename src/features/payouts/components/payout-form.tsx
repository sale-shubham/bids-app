'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/common/form-input';
import { payoutErrorMessage } from '../payouts.errors';
import {
  payoutDefaults,
  payoutSchema,
  toPayoutPayload,
  type PayoutFormValues,
  type PayoutParsedValues,
} from '../payouts.schema';
import { useCreatePayoutAccount } from '../use-payouts';

/**
 * Payout onboarding form. The account number is masked (password input) and is cleared from the
 * form as soon as it is submitted; the API only ever returns the last 4 digits.
 */
export function PayoutForm() {
  const create = useCreatePayoutAccount();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayoutFormValues, unknown, PayoutParsedValues>({ resolver: zodResolver(payoutSchema), defaultValues: payoutDefaults });

  const onSubmit = (v: PayoutParsedValues) =>
    create.mutate(toPayoutPayload(v), {
      onSuccess: () => {
        reset(payoutDefaults);
        toast.success('Payout details submitted. We will verify them shortly.');
      },
      onError: (e) => toast.error(payoutErrorMessage(e)),
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate autoComplete="off">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About you</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 @lg/content:grid-cols-2">
          <FormInput label="Legal name" required maxLength={120} error={errors.legalName?.message} {...register('legalName')} />
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">
              Business type <span className="text-destructive">*</span>
            </legend>
            <div className="flex flex-wrap gap-4 pt-1.5 text-sm">
              <Label className="inline-flex items-center gap-2 font-normal">
                <input type="radio" value="individual" className="accent-primary" {...register('businessType')} /> Individual
              </Label>
              <Label className="inline-flex items-center gap-2 font-normal">
                <input type="radio" value="proprietorship" className="accent-primary" {...register('businessType')} /> Proprietorship
              </Label>
            </div>
            {errors.businessType && <p className="text-xs text-destructive">{errors.businessType.message}</p>}
          </fieldset>
          <FormInput label="Mobile number" required inputMode="numeric" maxLength={10} prefix="+91" error={errors.phone?.message} {...register('phone')} />
          <FormInput
            label="PAN"
            required
            maxLength={10}
            autoCapitalize="characters"
            hint="Used only to verify your identity with our payment partner."
            error={errors.pan?.message}
            {...register('pan')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 @lg/content:grid-cols-2">
          <FormInput
            label="Account number"
            required
            type="password"
            inputMode="numeric"
            maxLength={18}
            autoComplete="off"
            hint="Hidden as you type. After you submit we only show the last 4 digits."
            error={errors.accountNumber?.message}
            {...register('accountNumber')}
          />
          <FormInput
            label="Confirm account number"
            required
            type="password"
            inputMode="numeric"
            maxLength={18}
            autoComplete="off"
            error={errors.confirmAccountNumber?.message}
            {...register('confirmAccountNumber')}
          />
          <FormInput label="IFSC" required maxLength={11} autoCapitalize="characters" error={errors.ifsc?.message} {...register('ifsc')} />
          <FormInput
            label="Account holder name"
            required
            maxLength={120}
            hint="As it appears on the bank account."
            error={errors.beneficiaryName?.message}
            {...register('beneficiaryName')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 @lg/content:grid-cols-2">
          <div className="@lg/content:col-span-2">
            <FormInput label="Street address" required maxLength={100} error={errors.street1?.message} {...register('street1')} />
          </div>
          <FormInput label="City" required maxLength={60} error={errors.city?.message} {...register('city')} />
          <FormInput label="State" required maxLength={60} error={errors.state?.message} {...register('state')} />
          <FormInput label="Postal code" required inputMode="numeric" maxLength={6} error={errors.postalCode?.message} {...register('postalCode')} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={create.isPending}>
          Submit payout details
        </Button>
      </div>
    </form>
  );
}
