'use client';
import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/common/form-input';
import { OtpInput } from '@/components/common/otp-input';
import { apiErrorCode } from '@/lib/api-client';
import { authErrorMessage } from '../auth.errors';
import { recoveryCodeSchema, twoFactorCodeSchema } from '../auth.schema';
import { useTwoFactorVerify } from '../use-auth';

interface LoginTwoFactorStepProps {
  challengeToken: string;
  /** Back to the password step (also used when the challenge expired). */
  onBack: (message?: string) => void;
}

// Login step 2 for accounts with 2FA: 6-digit authenticator code, or a recovery code.
// On success useTwoFactorVerify() stores the member and navigates exactly like a normal login.
export function LoginTwoFactorStep({ challengeToken, onBack }: LoginTwoFactorStepProps) {
  const verify = useTwoFactorVerify();
  const [useRecovery, setUseRecovery] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [recovery, setRecovery] = React.useState('');
  const [error, setError] = React.useState<string>();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = useRecovery
      ? recoveryCodeSchema.safeParse({ recoveryCode: recovery })
      : twoFactorCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    verify.mutate(
      { challengeToken, ...parsed.data },
      {
        onError: (err) => {
          if (apiErrorCode(err) === 'TWO_FACTOR_CHALLENGE_INVALID') {
            onBack(authErrorMessage(err));
            return;
          }
          const message = authErrorMessage(err, 'That code did not work');
          setError(message);
          setCode('');
          toast.error(message);
        },
      },
    );
  };

  const busy = verify.isPending || verify.isSuccess;

  return (
    <div>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">Two-factor authentication</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {useRecovery
          ? 'Enter one of your recovery codes. Each code works once.'
          : 'Enter the 6-digit code from your authenticator app.'}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {useRecovery ? (
          <FormInput
            label="Recovery code"
            autoComplete="off"
            autoFocus
            value={recovery}
            onChange={(e) => setRecovery(e.target.value)}
            error={error}
          />
        ) : (
          <OtpInput fill autoFocus value={code} onChange={setCode} error={error} disabled={busy} />
        )}
        <Button type="submit" className="w-full" loading={busy}>
          Verify and log in
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setUseRecovery((v) => !v);
            setError(undefined);
          }}
        >
          {useRecovery ? 'Use an authenticator code' : 'Use a recovery code'}
        </Button>
        <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => onBack()}>
          Back
        </Button>
      </form>
    </div>
  );
}
