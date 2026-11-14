import { create } from 'zustand';
import type { LiveStatus } from '@/features/live/live.types';

// Live state shared across the app:
// - `serverOffsetMs`: offset between the API server's clock and this device's clock. Every
//   response carrying `serverTime` refreshes it, so countdowns follow the server (which decides
//   when an auction really starts/ends) rather than a wrong device clock.
// - `status`: the tab's WebSocket state (features/live). Polling only runs when it is not `open`.
// - `connectionSeq`: bumped on every successful (re)connect, so screens can refetch what they
//   may have missed while the socket was down.
interface LiveState {
  serverOffsetMs: number;
  syncServerTime: (serverTimeIso: string) => void;
  status: LiveStatus;
  setStatus: (s: LiveStatus) => void;
  connectionSeq: number;
  markConnected: () => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  serverOffsetMs: 0,
  syncServerTime: (iso) => {
    const server = Date.parse(iso);
    if (Number.isFinite(server)) set({ serverOffsetMs: server - Date.now() });
  },
  status: 'idle',
  setStatus: (status) => set({ status }),
  connectionSeq: 0,
  markConnected: () => set((s) => ({ connectionSeq: s.connectionSeq + 1 })),
}));
