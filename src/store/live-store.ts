import { create } from 'zustand';

// Offset between the API server's clock and this device's clock. Every
// response carrying `serverTime` refreshes it, so countdowns follow the server
// (which decides when an auction really starts/ends) rather than a wrong
// device clock.
interface LiveState {
  serverOffsetMs: number;
  syncServerTime: (serverTimeIso: string) => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  serverOffsetMs: 0,
  syncServerTime: (iso) => {
    const server = Date.parse(iso);
    if (Number.isFinite(server)) set({ serverOffsetMs: server - Date.now() });
  },
}));
