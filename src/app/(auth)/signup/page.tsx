'use client';
import * as React from 'react';
import Link from 'next/link';
import { Gavel, Store } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FormInput } from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import { signupSchema, type SignupFormValues } from '@/features/auth/auth.schema';
import { authErrorMessage } from '@/features/auth/auth.errors';
import { useSignup } from '@/features/auth/use-auth';
import { VerifyEmailStep } from '@/features/auth/components/verify-email-step';
import { apiErrorCode } from '@/lib/api-client';
import { legalPagePath } from '@/constants/legal';
import { cn } from '@/lib/utils';

const ROLES = [
  { value: 'BIDDER', title: 'I want to bid', hint: 'Browse auctions and place bids.', icon: Gavel },
  { value: 'AUCTIONEER', title: 'I want to sell', hint: 'List items and run auctions.', icon: Store },
] as const;

export default function SignupPage() {
  const signup = useSignup();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'BIDDER' },
  });
  const [verify, setVerify] = React.useState<{ email: string; resendAfterSec: number } | null>(null);
  const { errors } = form.formState;

  const onSubmit = (values: SignupFormValues) =>
    signup.mutate(
      { name: values.name, email: values.email, password: values.password, role: values.role },
      {
        onSuccess: (data) =>
          setVerify({ email: data.email ?? values.email, resendAfterSec: data.resendAfterSec }),
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
      <p className="mt-1 text-sm text-muted-foreground">Join NobleBid to bid on or sell items.</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What would you like to do?</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(({ value, title, hint, icon: Icon }) => (
              <label key={value} className="cursor-pointer">
                <input type="radio" value={value} className="peer sr-only" {...form.register('role')} />
                <span
                  className={cn(
                    'flex h-full flex-col gap-1 rounded-xl border-2 bg-card p-3 transition-colors',
                    'hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5',
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
                  )}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
        </fieldset>

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
