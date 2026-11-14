'use client';
import * as React from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushSubscription } from '@/features/push/use-push';
import { hasEngaged, onEngagement } from '@/lib/engagement';
import { isStandalone } from '@/lib/pwa';

// Asked once per surface - the installed app and the browser tab. Once, because
// a person who said "Not now" does not want it on every visit, and a denied
// browser permission can never be asked for again. Per surface, because the app
// and the tab share localStorage and installing is a new decision.
const askedKey = (standalone: boolean) => `noblebid-push-asked:${standalone ? 'app' : 'web'}`;

// Long enough not to land on top of the bid/watch toast, short enough to read
// as a response to what the member just did.
const DELAY_MS = 2500;

function wasAsked(): boolean {
  try {
    return !!localStorage.getItem(askedKey(isStandalone()));
  } catch {
    return false;
  }
}

function markAsked() {
  try {
    localStorage.setItem(askedKey(isStandalone()), '1');
  } catch {
    /* private mode - the `shown` ref still limits it to one ask per session */
  }
}

/**
 * Soft prompt card for notifications. NOT shown on first visit: it appears only
 * after the member's first successful bid or first watchlist add
 * (`recordEngagement`, src/lib/engagement.ts) - the moment alerts are obviously
 * useful. It never calls `Notification.requestPermission()` by itself: a browser
 * prompt that appears unasked is the one people click "Block" on. Only "Turn on"
 * reaches the browser (usePushSubscription().enable -> requests permission, then
 * POST /push/subscribe). "Not now" leaves the Notifications switch in
 * Profile > App as the way back. Mounted from `(member)/layout.tsx`.
 */
export function PushPermissionPrompt() {
  const push = usePushSubscription();
  const [open, setOpen] = React.useState(false);
  const shown = React.useRef(false);

  // `state` only becomes 'off' once the existing-subscription check has
  // answered, so this also stays quiet for somebody already subscribed.
  // `blockedReason` covers pointless asks (iPhone not on the Home Screen, denied
  // permission, no worker in dev).
  const ready = push.state === 'off' && push.configured && !push.blockedReason;

  React.useEffect(() => {
    if (!ready || shown.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      if (shown.current || wasAsked() || !hasEngaged()) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        shown.current = true;
        markAsked();
        setOpen(true);
      }, DELAY_MS);
    };
    arm(); // engaged on an earlier visit, not asked yet
    const off = onEngagement(arm);
    return () => {
      clearTimeout(timer);
      off();
    };
  }, [ready]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Turn on notifications"
      className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg border bg-card p-3 shadow-lg md:bottom-4 md:left-auto md:right-4 md:mx-0"
    >
      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1">
        <p className="text-sm font-medium">Never miss an outbid</p>
        <p className="text-xs text-muted-foreground">
          Get alerts when you are outbid, win an auction or one is ending soon, with a count on the app icon, even when NobleBid is closed.
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setOpen(false);
              void push.enable();
            }}
          >
            Turn on
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Not now
          </Button>
        </div>
      </div>
      <button type="button" onClick={() => setOpen(false)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
