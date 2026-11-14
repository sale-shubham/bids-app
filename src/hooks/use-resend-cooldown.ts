'use client';
import * as React from 'react';

// Countdown timer for "Resend code". `initial` starts it already running (e.g.
// the server's `resendAfterSec` when the step mounts); call `start(sec?)`
// after each successful send.
export function useResendCooldown(seconds: number, initial = 0) {
  const [resendIn, setResendIn] = React.useState(initial);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const start = React.useCallback((sec?: number) => setResendIn(sec ?? seconds), [seconds]);

  return { resendIn, start };
}
