# Push notifications

Web Push for auction events: outbid, auction won, auction sold, ending soon, unsold, commission due/paid.

## Backend contract (bids-api `src/modules/push`, `notify`)
- `GET  /push/vapid-public-key` (public) -> `{ data: { publicKey } }`, empty when VAPID is not configured (the UI then shows "not set up on this server").
- `POST /push/subscribe` (member auth) body = `PushSubscription.toJSON()` (https endpoints only). Idempotent upsert on endpoint.
- `POST /push/unsubscribe` (member auth) body `{ endpoint }`.
- Payload delivered to the worker (`notify.service.ts`): `{ type, title, body, url }`; `type` is one of `outbid | auction-won | auction-sold | auction-unsold | commission-due | commission-paid | ending-soon`, `url` an in-app path (`/auctions/<id>` or the commission page). `badgeCount` is honoured if a payload ever carries it.
- `GET /notifications/unread-count` -> `{ count }` is the source for the in-app badge.

## Client
- `src/lib/push.ts`: support checks, `subscribeToPush`, `unsubscribeFromPush`, `syncAppBadge`, `onPermissionChange`.
- `src/features/push/*`: `usePushSubscription()` (state `unsupported | blocked | off | on`; re-posts the browser subscription on every sign-in), `useUnreadMessageCount`, `useAppBadge`.
- **Opt-in is never asked on first visit.** `<PushPermissionPrompt>` (member layout) shows a soft card after the member's first successful bid or first watchlist add (`recordEngagement()` in `usePlaceBid` / `useToggleWatch`). "Turn on" requests the browser permission, subscribes and calls `/push/subscribe`; "Not now" is remembered per surface (`noblebid-push-asked:web|app` in localStorage, wrapped in try/catch). Not shown when permission is denied, iOS is not on the Home Screen, or the server has no VAPID key.
- Profile -> App -> Notifications switch: subscribe/unsubscribe; the blocked state explains how to re-enable in browser/device settings (a page cannot withdraw or re-request a denied permission).

## Service worker
- `push`: shows a notification with `icon` (round 192), `badge` (monochrome 96), `tag = noblebid:<type>:<auctionId>` so a new outbid replaces the previous outbid for that auction; `renotify` + `requireInteraction` for outbid; actions "Bid again" (outbid) / "View". Skips the banner (not the badge) when the user is already looking at that exact page.
- `notificationclick`: focuses a tab already on the URL, else navigates an existing app window, else `openWindow(url)`; default `/notifications`.
- Badge: `navigator.setAppBadge(n)` from `badgeCount` when present; otherwise the open app syncs the unread count (`SET_BADGE` message). iOS needs the app on the Home Screen (16.4+).
- `pushsubscriptionchange`: re-subscribes with the old/server VAPID key and re-posts to `${API}/push/subscribe` (refresh-and-retry on 401). `API` comes from the `?api=` registration param; `connect-src` in the worker CSP (`next.config.ts`) allows that origin, or only `'self'` in proxy mode (`/api`).

## Testing locally
HTTPS or localhost only. Set `NEXT_PUBLIC_ENABLE_SW=1`, restart `next dev`, place a bid, accept the card, then trigger an outbid from the API.
