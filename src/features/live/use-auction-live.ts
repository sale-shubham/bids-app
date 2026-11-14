'use client';
import * as React from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import type { BidDTO } from '@/features/bids/bids.types';
import type { Paged } from '@/lib/paged';
import { useAuthStore } from '@/store/auth-store';
import { useLiveSocket } from './live-socket-provider';
import { applyBidPlaced, applyEnded, applyExtended, bidFromEvent, prependBidToPages } from './live.reducers';
import { isRoomEvent, type LiveEvent } from './live.types';

const LISTS_DEBOUNCE_MS = 5000;

/**
 * Subscribe to one auction's room while mounted and apply its events to the TanStack cache.
 * Guests get a socket only while this is mounted; members already have the app-wide one.
 */
export function useAuctionLive(auctionId: string) {
  const live = useLiveSocket();
  const qc = useQueryClient();
  const listsTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onEvent = React.useEffectEvent((e: LiveEvent) => {
    if (!isRoomEvent(e) || e.auctionId !== auctionId) return;
    const meId = useAuthStore.getState().member?.id;
    const key = ['auction', auctionId];
    switch (e.type) {
      case 'bid.placed':
        qc.setQueryData<AuctionDetail>(key, (a) => (a ? applyBidPlaced(a, e, meId) : a));
        qc.setQueryData<InfiniteData<Paged<BidDTO>, number>>(['auction-bids', auctionId], (d) =>
          prependBidToPages(d, bidFromEvent(e, meId)),
        );
        // Browse lists only need to catch up eventually, not on every bid.
        clearTimeout(listsTimer.current);
        listsTimer.current = setTimeout(() => void qc.invalidateQueries({ queryKey: ['auctions'] }), LISTS_DEBOUNCE_MS);
        break;
      case 'auction.extended':
        qc.setQueryData<AuctionDetail>(key, (a) => (a ? applyExtended(a, e) : a));
        toast.info('Time extended', { id: `extended-${auctionId}` });
        break;
      case 'auction.ended':
        qc.setQueryData<AuctionDetail>(key, (a) => (a ? applyEnded(a, e) : a));
        // Winner and contact details come from the server.
        void qc.invalidateQueries({ queryKey: key });
        void qc.invalidateQueries({ queryKey: ['auctions'] });
        break;
    }
  });

  React.useEffect(() => {
    if (!live) return;
    const { socket, retainGuest } = live;
    const release = retainGuest();
    socket.subscribe(auctionId);
    const off = socket.onEvent((e) => onEvent(e));
    return () => {
      off();
      socket.unsubscribe(auctionId);
      release();
    };
  }, [live, auctionId]);

  React.useEffect(() => () => clearTimeout(listsTimer.current), []);
}
