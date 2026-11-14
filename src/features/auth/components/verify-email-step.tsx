'use client';
import * as React from 'react';
import { MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { OtpStep } from '@/components/common/otp-step';
import { Button } from '@/components/ui/button';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';
import { authErrorMessage } from '../auth.errors';
import { useSignupResend, useSignupVerify } from '../use-auth';

interface VerifyEmailStepProps {
  email: string;
  /** Seconds until "Resend" unlocks, as returned by the API that sent the code. */
  resendAfterSec: number;
  /** Back to the previous step (change email / back to the form). */
  onBack: () => void;
}

// Email OTP step shared by signup and by login's EMAIL_NOT_VERIFIED branch.
// On success useSignupVerify() stores the member and navigates away.
export function VerifyEmailStep({ email, resendAfterSec, onBack }: VerifyEmailStepProps) {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();
  const verify = useSignupVerify();
  const resend = useSignupResend();
  const { resendIn, start } = useResendCooldown(resendAfterSec, resendAfterSec);

  const submit = (value: string) => {
    setError(undefined);
    verify.mutate(
      { email, code: value },
      {
        onError: (e) => {
          const message = authErrorMessage(e, 'That code did not work');
          setError(message);
          setCode('');
          toast.error(message);
        },
      },
    );
  };

  const onResend = () =>
    resend.mutate(
      { email },
      {
        onSuccess: (r) => {
          start(r.resendAfterSec);
          setCode('');
          setError(undefined);
          toast.success('A new code is on its way');
        },
        onError: (e) => toast.error(authErrorMessage(e, 'Could not resend the code')),
      },
    );

  return (
    <div>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">Verify your email</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>.
      </p>
      <div className="mt-6 space-y-4">
        <OtpStep
          fill
          autoFocus
          code={code}
          onChange={setCode}
          onComplete={submit}
          error={error}
          verifying={verify.isPending || verify.isSuccess}
          resendIn={resendIn}
          onResend={onResend}
          resending={resend.isPending}
        />
        <Button
          type="button"
          className="w-full"
          loading={verify.isPending || verify.isSuccess}
          disabled={code.length !== 6}
          onClick={() => submit(code)}
        >
          Verify and continue
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack} disabled={verify.isPending}>
          Back
        </Button>
      </div>
    </div>
  );
}
