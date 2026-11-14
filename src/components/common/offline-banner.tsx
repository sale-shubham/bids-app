'use client';
import * as React from 'react';
import { WifiOff } from 'lucide-react';

// Replaces the service worker's old /offline navigation fallback. public/sw.js
// no longer intercepts navigations at all — doing so dropped the Set-Cookie on
// the auth middleware's redirects — so being offline has to be surfaced by the
// app rather than by a cached shell.
//
// navigator.onLine only proves the radio is up, not that the API is reachable,
// so the copy stays about saving rather than claiming the app is unusable.
export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-60 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs font-medium text-destructive-foreground"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      You&apos;re offline — changes can&apos;t be saved until the connection is back.
    </div>
  );
}
