import { api } from '@/lib/api-client';

// Web Push subscription endpoints (bids-api src/modules/push/) — see
// readme/flows/push-notifications.md.

/** '' when the API has no VAPID key pair — push is not set up there. */
export const fetchVapidPublicKey = () =>
  api.get('/push/vapid-public-key').then((r) => (r.data.data as { publicKey: string }).publicKey);

/** Body is the browser's own `PushSubscription.toJSON()`. Idempotent (upsert on endpoint). */
export const savePushSubscription = (subscription: PushSubscriptionJSON) =>
  api.post('/push/subscribe', subscription).then((r) => r.data.data as { id: string });

export const removePushSubscription = (endpoint: string) =>
  api.post('/push/unsubscribe', { endpoint }).then((r) => r.data.data as { endpoint: string });

/** Unread notification total for the app-icon badge. TODO(Phase 5): backed by bids-api notifications. */
export const fetchUnreadCount = () =>
  api.get('/notifications/unread-count').then((r) => (r.data.data as { unread: number }).unread);
