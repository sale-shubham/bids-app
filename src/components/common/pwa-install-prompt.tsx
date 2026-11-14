'use client';
import * as React from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientSnapshot, useInstallAvailable } from '@/hooks/use-client-state';
import { isStandalone, promptInstall } from '@/lib/pwa';

const DISMISS_KEY = 'noblebid-install-dismissed';

// Bottom banner offering "Add to Home Screen" once the browser fires
// beforeinstallprompt. Hidden when already installed or previously dismissed.
export function PwaInstallPrompt() {
  const available = useInstallAvailable();
  // Hidden (true) until hydrated, then whatever this tab stored.
  const storedDismissed = useClientSnapshot(() => sessionStorage.getItem(DISMISS_KEY) === '1', true);
  const [dismissedNow, setDismissed] = React.useState(false);
  const dismissed = storedDismissed || dismissedNow;

  if (!available || dismissed || isStandalone()) return null;

  const close = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-card p-3 shadow-lg sm:left-auto sm:right-4 sm:mx-0">
      <Download className="h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1">
        <p className="text-sm font-medium">Install NobleBid</p>
        <p className="text-xs text-muted-foreground">Add to your home screen for a faster, app-like experience.</p>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await promptInstall();
          close();
        }}
      >
        Install
      </Button>
      <button type="button" onClick={close} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
