'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { usePushSubscription } from '@/features/push/use-push';
import { isStandalone } from '@/lib/pwa';

// Asked once per surface — the installed app and the browser tab — the way
// unikorncoatings_app asks. Once, because a person who said "Not now" does not
// want it on every visit, and Chrome stops showing its own permission prompt
// after a few refusals. Per surface, because the app and the tab are the same
// origin and share localStorage: a single flag let a "Not now" in the tab use
// up the installed app's only ask, and the home-screen icon is exactly where
// being notified starts to matter. Installing is a new decision, so it gets a
// new ask. (`noblebid-push-asked:app` predates the `:web` key and keeps its name, so
// nobody who already answered in the app is asked again.)
const askedKey = (standalone: boolean) => `noblebid-push-asked:${standalone ? 'app' : 'web'}`;

// Long enough not to land on a page still rendering, short enough to read as a
// response to opening the app rather than a notification out of nowhere.
const DELAY_MS = 4000;

/**
 * Offers to turn on new-message notifications, once per surface.
 *
 * Mounted from `(member)/layout.tsx` for the whole member area, not only
 * /chat (until 2026-11-04 it lived in chat/layout.tsx): someone who installs
 * the app lands on whatever page they open first, and a member who never
 * happens to open Chat was never asked — no permission, no push subscription,
 * no notification and no count on the app icon. Members only: admins don't
 * DM. Not gated on `MEMBER_CHAT` — that gates *sending*; a member without it
 * still receives messages (readme/flows/messaging.md).
 *
 * It does **not** call `Notification.requestPermission()` by itself: a browser
 * prompt that appears unasked is the one people click "Block" on, and a
 * blocked permission cannot be asked for again. So the app asks in its own
 * voice first; only "Turn on" reaches the browser. "Not now" leaves the
 * Message notifications switch on the Profile page's App tab as the way back.
 */
export function PushPermissionPrompt() {
  const push = usePushSubscription();
  const shown = React.useRef(false);

  // `state` is 'unsupported' until after mount and only becomes 'off' once the
  // existing-subscription check has answered, so waiting on it also stops this
  // firing for somebody already subscribed. `blockedReason` covers the cases
  // where asking is pointless (an iPhone that has not added the app to its
  // Home Screen, a denied permission, a dev server without the worker).
  const ready = push.state === 'off' && push.configured && !push.blockedReason;

  // `usePushSubscription()` returns a fresh object each render; depending on it
  // would restart the timer below every render. The action is read through a
  // ref updated after each render instead.
  const enable = React.useRef(push.enable);
  React.useEffect(() => {
    enable.current = push.enable;
  });

  React.useEffect(() => {
    if (!ready || shown.current) return;
    const key = askedKey(isStandalone());
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      // Private mode / storage blocked — the ref still limits it to one ask per session.
    }

    const timer = setTimeout(() => {
      shown.current = true;
      try {
        localStorage.setItem(key, '1');
      } catch {
        /* see above */
      }
      toast('Get notified about your auctions', {
        description: 'Turn on notifications and NobleBid will show outbid and auction alerts — and a count on the app icon — even with the app closed.',
        duration: Infinity,
        action: { label: 'Turn on', onClick: () => void enable.current() },
        cancel: { label: 'Not now', onClick: () => {} },
      });
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [ready]);

  return null;
}
