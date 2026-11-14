'use client';
import * as React from 'react';

// Countdown timer for "Resend OTP" — call `start()` after a successful send.
export function useResendCooldown(seconds: number) {
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const start = React.useCallback(() => setResendIn(seconds), [seconds]);

  return { resendIn, start };
}
