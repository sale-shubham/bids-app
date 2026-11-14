'use client';
import * as React from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClientSnapshot, useInstallAvailable } from '@/hooks/use-client-state';
import { countVisit, hasPlacedBid, onEngagement } from '@/lib/engagement';
import { isIosSafari, isStandalone, promptInstall } from '@/lib/pwa';

const DISMISS_KEY = 'noblebid-install-dismissed';
// Stored so a dismissal outlasts the tab: re-asking every session is nagging.
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;
// Late enough not to cover the push soft prompt that follows the same bid.
const DELAY_MS = 8000;

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

/**
 * Install banner. Android/desktop: shown once the browser fires
 * `beforeinstallprompt`. iOS Safari (not yet standalone): no such event exists,
 * so the banner opens an "Add to Home Screen" instructions sheet instead.
 * Either way it waits for intent - the visitor's 2nd visit or first bid - and is
 * hidden when installed or recently dismissed. Profile > App always has the
 * install button.
 */
export function PwaInstallPrompt() {
  const available = useInstallAvailable();
  const ios = useClientSnapshot(isIosSafari, false);
  const storedDismissed = useClientSnapshot(dismissedRecently, true);
  const [dismissedNow, setDismissed] = React.useState(false);
  const [eligible, setEligible] = React.useState(false);
  const [sheet, setSheet] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      if (countVisit() >= 2 || hasPlacedBid()) setEligible(true);
    };
    const timer = setTimeout(check, DELAY_MS);
    const off = onEngagement(() => setTimeout(check, DELAY_MS));
    return () => {
      clearTimeout(timer);
      off();
    };
  }, []);

  const dismissed = storedDismissed || dismissedNow;
  const canShow = eligible && !dismissed && !isStandalone() && (available || ios);
  if (!canShow) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* blocked - the state below still hides it for this visit */
    }
    setDismissed(true);
  };

  return (
    <>
      <div className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-card p-3 shadow-lg md:bottom-4 md:left-auto md:right-4 md:mx-0">
        <Download className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Install NobleBid</p>
          <p className="text-xs text-muted-foreground">Add to your home screen for faster bidding and outbid alerts.</p>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            if (ios) {
              setSheet(true);
              return;
            }
            await promptInstall();
            close();
          }}
        >
          {ios ? 'How to' : 'Install'}
        </Button>
        <button type="button" onClick={close} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add NobleBid to your Home Screen</DialogTitle>
            <DialogDescription>iPhone and iPad install apps from Safari&apos;s Share menu.</DialogDescription>
          </DialogHeader>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Tap the Share button in Safari&apos;s toolbar.</li>
            <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</li>
            <li>Tap &ldquo;Add&rdquo;. Open NobleBid from your Home Screen to turn on notifications.</li>
          </ol>
          <Button
            className="w-full"
            onClick={() => {
              setSheet(false);
              close();
            }}
          >
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
