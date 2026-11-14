'use client';
import * as React from 'react';
import { useLiveStore } from '@/store/live-store';

// Pushes a server-rendered `serverTime` into the live store so countdowns on
// this page follow the API's clock from the first tick.
export function ServerTimeSync({ serverTime }: { serverTime?: string | null }) {
  const sync = useLiveStore((s) => s.syncServerTime);
  React.useEffect(() => {
    if (serverTime) sync(serverTime);
  }, [serverTime, sync]);
  return null;
}
