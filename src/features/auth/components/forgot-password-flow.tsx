'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FormInput } from '@/components/common/form-input';
import { OtpInput } from '@/components/common/otp-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from '../auth.schema';
import { authErrorMessage } from '../auth.errors';
import { useForgotPassword, useResetPassword } from '../use-auth';

const DEFAULT_RESEND_SEC = 60;

// Step 1: email -> step 2: code + new password. `initialEmail` (from
// /reset-password?email=) opens step 2 directly.
export function ForgotPasswordFlow({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = React.useState(initialEmail ?? '');
  const [step, setStep] = React.useState<1 | 2>(initialEmail ? 2 : 1);
  const { resendIn, start } = useResendCooldown(DEFAULT_RESEND_SEC);
  const forgot = useForgotPassword();

  const sendCode = (to: string, onDone?: () => void) =>
    forgot.mutate(
      { email: to },
      {
        onSuccess: (r) => {
          start(r?.resendAfterSec ?? DEFAULT_RESEND_SEC);
          onDone?.();
        },
        onError: (e) => toast.error(authErrorMessage(e, 'Could not send the code')),
      },
    );

  if (step === 1) {
    return (
      <EmailStep
        pending={forgot.isPending}
        defaultEmail={email}
        onSubmit={(value) =>
          sendCode(value, () => {
            setEmail(value);
            setStep(2);
            toast.success('If that email has an account, a code is on its way.');
          })
        }
      />
    );
  }

  return (
    <ResetStep
      email={email}
      resendIn={resendIn}
      resending={forgot.isPending}
      onResend={() => sendCode(email, () => toast.success('A new code is on its way'))}
      onChangeEmail={() => setStep(1)}
    />
  );
}

function EmailStep({
  defaultEmail,
  pending,
  onSubmit,
}: {
  defaultEmail: string;
  pending: boolean;
  onSubmit: (email: string) => void;
}) {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: defaultEmail },
  });
  return (
    <div>
      <h1 className="text-2xl font-bold">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we will send you a 6-digit code to reset it.
      </p>
      <form onSubmit={form.handleSubmit((v) => onSubmit(v.email))} className="mt-6 space-y-4" noValidate>
        <FormInput
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Button type="submit" className="w-full" loading={pending}>
          {pending ? 'Sending…' : 'Send code'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}

function ResetStep({
  email,
  resendIn,
  resending,
  onResend,
  onChangeEmail,
}: {
  email: string;
  resendIn: number;
  resending: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  const router = useRouter();
  const reset = useResetPassword();
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '' },
  });
  const { errors } = form.formState;

  const onSubmit = (values: ResetPasswordFormValues) =>
    reset.mutate(
      { email, code: values.code, password: values.password },
      {
        onSuccess: () => {
          toast.success('Password updated. Log in with your new password.');
          router.replace('/login');
        },
        onError: (e) => {
          const message = authErrorMessage(e, 'Could not reset your password');
          form.setError('code', { message });
          toast.error(message);
        },
      },
    );

  return (
    <div>
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the code sent to <span className="font-medium text-foreground">{email}</span> and choose a new
        password.{' '}
        <button type="button" onClick={onChangeEmail} className="font-medium text-primary hover:underline">
          Change email
        </button>
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label>Verification code</Label>
          <Controller
            control={form.control}
            name="code"
            render={({ field }) => (
              <OtpInput fill autoFocus value={field.value} onChange={field.onChange} error={errors.code?.message} />
            )}
          />
          <div className="text-sm text-muted-foreground">
            {resendIn > 0 ? (
              <>Resend code in {resendIn} seconds</>
            ) : (
              <button
                type="button"
                onClick={onResend}
                disabled={resending}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            )}
          </div>
        </div>
        <FormInput
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="8–72 characters, with at least one letter and one number."
          error={errors.password?.message}
          {...form.register('password')}
        />
        <FormInput
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        <Button type="submit" className="w-full" loading={reset.isPending || reset.isSuccess}>
          {reset.isPending ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}
