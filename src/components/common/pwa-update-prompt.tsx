'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { applyUpdateAndReload, fetchDeployedBuildId } from '@/lib/pwa';

const POLL_MS = 5 * 60 * 1000; // 5 min

// Watches /version.json for a new deploy. Baseline = whatever buildId was live
// when this client loaded; any later change means a fresh deploy is available.
// Polls on an interval and whenever the tab regains focus.
export function PwaUpdatePrompt() {
  const baseline = React.useRef<string | null>(null);
  const notified = React.useRef(false);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const check = async () => {
      const current = await fetchDeployedBuildId();
      if (!current) return;
      if (baseline.current === null) {
        baseline.current = current; // first read sets the baseline
        return;
      }
      if (current !== baseline.current && !notified.current) {
        notified.current = true;
        toast('A new version of NobleBid is available', {
          duration: Infinity,
          action: { label: 'Reload', onClick: () => applyUpdateAndReload() },
        });
      }
    };

    void check();
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
