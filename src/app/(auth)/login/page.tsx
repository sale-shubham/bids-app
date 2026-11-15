'use client';
import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FormInput } from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import { loginSchema, type LoginFormValues } from '@/features/auth/auth.schema';
import { authErrorMessage } from '@/features/auth/auth.errors';
import { useLogin } from '@/features/auth/use-auth';
import { LoginTwoFactorStep } from '@/features/auth/components/login-two-factor-step';
import { VerifyEmailStep } from '@/features/auth/components/verify-email-step';
import { apiErrorCode, apiErrorDetails } from '@/lib/api-client';

const DEFAULT_RESEND_SEC = 60;

// Email + password login; an account with 2FA continues to a code step (LoginTwoFactorStep). EMAIL_NOT_VERIFIED switches to the OTP step (the API
// has just emailed a fresh code); ACCOUNT_SUSPENDED is handled by the axios
// interceptor, which sends the user to /suspended.
export default function LoginPage() {
  const login = useLogin();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
  const [verify, setVerify] = React.useState<{ email: string; resendAfterSec: number } | null>(null);

  const [challengeToken, setChallengeToken] = React.useState<string | null>(null);

  const onSubmit = (values: LoginFormValues) =>
    login.mutate(values, {
      onSuccess: (result) => {
        if ('twoFactorRequired' in result) setChallengeToken(result.challengeToken);
      },
      onError: (e) => {
        const code = apiErrorCode(e);
        if (code === 'EMAIL_NOT_VERIFIED') {
          const sec = Number(apiErrorDetails(e)?.resendAfterSec);
          setVerify({ email: values.email, resendAfterSec: sec > 0 ? sec : DEFAULT_RESEND_SEC });
          toast.info('Please verify your email. We have sent you a new code.');
          return;
        }
        if (code === 'ACCOUNT_SUSPENDED') return;
        toast.error(authErrorMessage(e, 'Could not log in'));
      },
    });

  if (challengeToken) {
    return (
      <LoginTwoFactorStep
        challengeToken={challengeToken}
        onBack={(message) => {
          setChallengeToken(null);
          login.reset();
          form.resetField('password');
          if (message) toast.error(message);
        }}
      />
    );
  }

  if (verify) {
    return <VerifyEmailStep {...verify} onBack={() => setVerify(null)} />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back to NobleBid.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <FormInput
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <div className="space-y-1.5">
          <FormInput
            label="Password"
            type="password"
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full" loading={login.isPending || login.isSuccess}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to NobleBid?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
