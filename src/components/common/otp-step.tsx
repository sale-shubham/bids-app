'use client';
import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { OtpInput } from '@/components/common/otp-input';
import { Button } from '@/components/ui/button';

interface OtpStepProps {
  length?: number;
  code: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  error?: string;
  verifying: boolean;
  verified?: boolean;
  resendIn: number;
  onResend: () => void;
  resending: boolean;
  autoFocus?: boolean;
  /** Passed through to `OtpInput` — see its own doc comment. */
  fill?: boolean;
}

// Label + OtpInput + resend timer/button, with a "verified" checkmark state —
// shared by the login page's single OTP step and signup's two (mobile+email)
// OTP blocks shown together.
export function OtpStep({
  length = 6,
  code,
  onChange,
  onComplete,
  error,
  verifying,
  verified,
  resendIn,
  onResend,
  resending,
  autoFocus,
  fill,
}: OtpStepProps) {
  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" /> Verified
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <OtpInput
        length={length}
        value={code}
        disabled={verifying}
        error={error}
        autoFocus={autoFocus}
        fill={fill}
        onChange={(value) => {
          onChange(value);
          if (value.length === length && !verifying) onComplete(value);
        }}
      />
      {resendIn > 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive OTP? Resend in {resendIn} seconds
        </p>
      ) : (
        <Button type="button" variant="ghost" className="w-full" disabled={resending} onClick={onResend}>
          Resend OTP
        </Button>
      )}
    </div>
  );
}
