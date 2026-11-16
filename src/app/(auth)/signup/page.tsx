'use client';
import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FormInput } from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import { signupSchema, type SignupFormValues } from '@/features/auth/auth.schema';
import { authErrorMessage } from '@/features/auth/auth.errors';
import { useSignup } from '@/features/auth/use-auth';
import { VerifyEmailStep } from '@/features/auth/components/verify-email-step';
import { captureReferralCode, clearReferralCode, readReferralCode } from '@/features/referrals/referral-code';
import { apiErrorCode } from '@/lib/api-client';
import { legalPagePath } from '@/constants/legal';

export default function SignupPage() {
  const signup = useSignup();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });
  const [verify, setVerify] = React.useState<{ email: string; resendAfterSec: number } | null>(null);
  const { errors } = form.formState;

  // `?ref=CODE` (from a friend's invite link) is remembered for 30 days and sent with signup.
  React.useEffect(() => {
    captureReferralCode(new URLSearchParams(window.location.search).get('ref'));
  }, []);

  const onSubmit = (values: SignupFormValues) =>
    signup.mutate(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        ...(readReferralCode() ? { referralCode: readReferralCode()! } : {}),
      },
      {
        onSuccess: (data) => {
          clearReferralCode();
          setVerify({ email: data.email ?? values.email, resendAfterSec: data.resendAfterSec });
        },
        onError: (e) => {
          const message = authErrorMessage(e, 'Could not create your account');
          if (apiErrorCode(e) === 'EMAIL_TAKEN') form.setError('email', { message });
          toast.error(message);
        },
      },
    );

  if (verify) {
    return <VerifyEmailStep {...verify} onBack={() => setVerify(null)} />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Join NobleBid to bid on and sell items with one account.</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <FormInput
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...form.register('name')}
        />
        <FormInput
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <FormInput
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="8–72 characters, with at least one letter and one number."
          error={errors.password?.message}
          {...form.register('password')}
        />
        <FormInput
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />

        <div className="space-y-1">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              aria-invalid={!!errors.terms}
              {...form.register('terms')}
            />
            <span>
              I agree to the{' '}
              <Link
                href={legalPagePath('terms-conditions')}
                target="_blank"
                className="font-medium text-primary hover:underline"
              >
                Terms and Conditions
              </Link>
              .
            </span>
          </label>
          {errors.terms && <p className="text-xs text-destructive">{errors.terms.message}</p>}
        </div>

        <Button type="submit" className="w-full" loading={signup.isPending}>
          {signup.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
