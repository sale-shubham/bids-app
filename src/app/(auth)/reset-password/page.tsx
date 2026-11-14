import { ForgotPasswordFlow } from '@/features/auth/components/forgot-password-flow';

// /reset-password?email=you@example.com opens the "code + new password" step
// directly (e.g. from the link in the reset email). Without an email it starts
// at step 1, same as /forgot-password.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const { email } = await searchParams;
  const value = Array.isArray(email) ? email[0] : email;
  return <ForgotPasswordFlow initialEmail={value?.trim() || undefined} />;
}
