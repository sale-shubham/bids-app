'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { unreadCountKey } from '@/features/push/use-push';
import { formatINR } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useLiveStore } from '@/store/live-store';
import { fetchWsTicket } from './live.api';
import { LiveSocket } from './live-socket';
import { isMemberEvent, type LiveEvent } from './live.types';

interface LiveContextValue {
  socket: LiveSocket;
  /** A guest-capable screen (an auction page) needs the socket. Returns the release function. */
  retainGuest: () => () => void;
}

const LiveContext = React.createContext<LiveContextValue | null>(null);

export function useLiveSocket(): LiveContextValue | null {
  return React.useContext(LiveContext);
}

/**
 * One WebSocket per tab. Members: open app-wide (member ticket) so outbid / won / notification
 * events arrive on every page. Guests: open only while an auction page retains it.
 */
export function LiveSocketProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const memberId = useAuthStore((s) => s.member?.id);
  const initialized = useAuthStore((s) => s.initialized);
  const [socket] = React.useState(() => new LiveSocket({ fetchTicket: fetchWsTicket }));
  const guestCount = React.useRef(0);
  const identity = React.useRef({ initialized: false, member: false });

  const applyMode = React.useCallback(() => {
    const { initialized: ready, member } = identity.current;
    socket.setMode(!ready ? null : member ? 'member' : guestCount.current > 0 ? 'guest' : null);
  }, [socket]);

  const retainGuest = React.useCallback(() => {
    guestCount.current += 1;
    applyMode();
    return () => {
      guestCount.current = Math.max(0, guestCount.current - 1);
      applyMode();
    };
  }, [applyMode]);

  // Login / logout / account switch: close so the next open uses the right kind of ticket.
  React.useEffect(() => {
    socket.close();
    identity.current = { initialized, member: !!memberId };
    applyMode();
  }, [socket, applyMode, initialized, memberId]);

  React.useEffect(() => {
    const { setStatus, markConnected } = useLiveStore.getState();
    setStatus(socket.getStatus());
    const offStatus = socket.onStatus(setStatus);
    const offOpen = socket.onOpen(markConnected);
    return () => {
      offStatus();
      offOpen();
      socket.close();
    };
  }, [socket]);

  const onMemberEvent = React.useEffectEvent((e: LiveEvent) => {
    if (!isMemberEvent(e)) return;
    switch (e.type) {
      case 'bid.outbid':
        toast.warning(`You've been outbid on ${e.title}`, {
          id: `outbid-${e.auctionId}`,
          action: { label: 'Bid again', onClick: () => router.push(`/auctions/${e.auctionId}`) },
        });
        void qc.invalidateQueries({ queryKey: ['my-bids'] });
        break;
      case 'auction.won':
        toast.success(`You won ${e.title} for ${formatINR(e.finalBidPaise)}`, {
          id: `won-${e.auctionId}`,
          action: { label: 'View', onClick: () => router.push(`/auctions/${e.auctionId}`) },
        });
        void qc.invalidateQueries({ queryKey: ['my-bids'] });
        break;
      case 'notification.new':
        void qc.invalidateQueries({ queryKey: ['notifications'] });
        void qc.invalidateQueries({ queryKey: unreadCountKey });
        break;
    }
  });

  React.useEffect(() => socket.onEvent((e) => onMemberEvent(e)), [socket]);

  const value = React.useMemo(() => ({ socket, retainGuest }), [socket, retainGuest]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
