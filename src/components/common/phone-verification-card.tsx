'use client';
import * as React from 'react';
import { BadgeCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OtpStep } from '@/components/common/otp-step';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';
import { apiErrorCode, apiErrorDetails, apiErrorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { toIndianMobile } from '@/features/members/members.schema';
import { useSendPhoneOtp, useVerifyPhone } from '@/features/members/use-members';
import { useAuthStore } from '@/store/auth-store';

const DEFAULT_COOLDOWN_SEC = 60;

// Rate-limit errors carry the API's own wait text; show it instead of a generic line.
function otpErrorMessage(e: unknown, fallback: string) {
  const code = apiErrorCode(e);
  if (code === 'TOO_MANY_REQUESTS' || code === 'RATE_LIMITED') return apiErrorMessage(e, 'Too many attempts. Please wait a moment and try again.');
  return apiErrorMessage(e, fallback);
}

// Security > Phone number: a verified badge, or the send code -> 6-digit input -> verify flow.
// The number comes from the profile (Account tab); changing it there clears verification server-side.
export function PhoneVerificationCard() {
  const member = useAuthStore((s) => s.member);
  const send = useSendPhoneOtp();
  const verify = useVerifyPhone();
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();
  const { resendIn, start } = useResendCooldown(DEFAULT_COOLDOWN_SEC);

  if (!member) return null;
  const phone = toIndianMobile(member.phone);
  const verified = !!member.phoneVerifiedAt;

  const sendCode = () => {
    if (!phone) return;
    send.mutate(phone, {
      onSuccess: (r) => {
        setSentTo(r.sentTo);
        setCode('');
        setError(undefined);
        start();
        toast.success(`Code sent to ${r.sentTo}`);
      },
      onError: (e) => {
        const wait = Number(apiErrorDetails(e)?.retryAfterSec ?? apiErrorDetails(e)?.resendAfterSec);
        if (wait > 0) start(wait);
        toast.error(otpErrorMessage(e, 'Could not send the code'));
      },
    });
  };

  const submit = (value: string) => {
    if (!phone) return;
    setError(undefined);
    verify.mutate(
      { phone, code: value },
      {
        onSuccess: () => {
          toast.success('Phone number verified');
          setSentTo(null);
          setCode('');
        },
        onError: (e) => {
          const message = otpErrorMessage(e, 'That code did not work');
          setError(message);
          setCode('');
          toast.error(message);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Phone number</CardTitle>
          {verified && (
            <Badge variant="success" className="gap-1">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified
            </Badge>
          )}
        </div>
        <CardDescription>
          {verified
            ? `${member.phone} was verified${member.phoneVerifiedAt ? ` on ${formatDate(member.phoneVerifiedAt)}` : ''}. Changing it in your profile will remove the verification.`
            : 'Verify your mobile number to help earn the verified-seller badge and keep your account safe.'}
        </CardDescription>
      </CardHeader>
      {!verified && (
        <CardContent className="space-y-4">
          {!phone ? (
            <p className="text-sm text-muted-foreground">
              Add a valid 10-digit mobile number in the Account tab first, then come back to verify it.
            </p>
          ) : !sentTo ? (
            <Button type="button" onClick={sendCode} loading={send.isPending}>
              <Smartphone className="h-4 w-4" /> Verify {member.phone}
            </Button>
          ) : (
            <div className="max-w-sm space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code we texted to <span className="font-medium text-foreground">{sentTo}</span>.
              </p>
              <OtpStep
                fill
                autoFocus
                code={code}
                onChange={setCode}
                onComplete={submit}
                error={error}
                verifying={verify.isPending}
                resendIn={resendIn}
                onResend={sendCode}
                resending={send.isPending}
              />
              <Button type="button" className="w-full" loading={verify.isPending} disabled={code.length !== 6} onClick={() => submit(code)}>
                Verify phone
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
