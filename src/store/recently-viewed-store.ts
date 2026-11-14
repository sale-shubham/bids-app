import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { AuctionCard } from '@/features/auctions/auctions.types';

const MAX = 10;

// localStorage can be missing or throw (private mode, blocked site data) — fall
// back to a no-op so the store still works in memory.
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

interface RecentlyViewedState {
  items: AuctionCard[];
  add: (card: AuctionCard) => void;
  clear: () => void;
}

// skipHydration: the server render has no localStorage, so readers call
// `useRecentlyViewedStore.persist.rehydrate()` after mount to avoid a hydration mismatch.
export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      add: (card) => set((s) => ({ items: [card, ...s.items.filter((i) => i.id !== card.id)].slice(0, MAX) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'nb-recently-viewed', storage: createJSONStorage(() => safeStorage), skipHydration: true, version: 1 },
  ),
);
