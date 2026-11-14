'use client';
import * as React from 'react';
import { isInstallAvailable, onInstallAvailabilityChange } from '@/lib/pwa';

// Client-only values read through useSyncExternalStore: the server snapshot is
// used during SSR and hydration, the client snapshot right after — the same
// result the old `useEffect(() => setX(read()), [])` pattern gave, without a
// setState inside an effect (react-hooks/set-state-in-effect).

const noopSubscribe = () => () => {};

/** False on the server and during hydration, true once mounted on the client. */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Whether the browser has offered a PWA install prompt; live-updates. */
export function useInstallAvailable(): boolean {
  return React.useSyncExternalStore(
    (onChange) => onInstallAvailabilityChange(() => onChange()),
    isInstallAvailable,
    () => false,
  );
}

/**
 * A value read once from browser storage (or any client-only source) after
 * hydration; `serverValue` until then. Not live — callers that change the
 * stored value keep their own state on top of it.
 */
export function useClientSnapshot<T>(read: () => T, serverValue: T): T {
  return React.useSyncExternalStore(noopSubscribe, read, () => serverValue);
}
