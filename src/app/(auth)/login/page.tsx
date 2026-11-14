'use client';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FormInput } from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import { loginSchema, type LoginFormValues } from '@/features/auth/auth.schema';
import { useLogin } from '@/features/auth/use-auth';
import { apiErrorMessage } from '@/lib/api-client';
import { getDeviceInfo } from '@/lib/device-info';

// Email + password login. Phase 0 placeholder form — wired to POST /auth/login,
// which bids-api provides from Phase 1.
export default function LoginPage() {
  const login = useLogin();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginFormValues) =>
    login.mutate(
      { ...values, deviceInfo: getDeviceInfo() },
      { onError: (e) => toast.error(apiErrorMessage(e, 'Could not log in')) },
    );

  return (
    <div>
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back to NobleBid.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <FormInput
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <FormInput
          label="Password"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        New here?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
