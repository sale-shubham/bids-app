export type LiveStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'unavailable';

export interface LiveBid {
  id: string;
  amountPaise: number;
  createdAt: string;
  bidderLabel: string;
}

export interface BidPlacedEvent {
  type: 'bid.placed';
  auctionId: string;
  currentBidPaise: number;
  bidCount: number;
  endTime: string;
  highestBidderId: string | null;
  bid: LiveBid;
}
export interface AuctionExtendedEvent {
  type: 'auction.extended';
  auctionId: string;
  endTime: string;
}
export interface AuctionEndedEvent {
  type: 'auction.ended';
  auctionId: string;
  winnerId: string | null;
  finalBidPaise: number;
  bidCount: number;
  endedAt: string;
}
export interface BidOutbidEvent {
  type: 'bid.outbid';
  auctionId: string;
  title: string;
  currentBidPaise: number;
}
export interface AuctionWonEvent {
  type: 'auction.won';
  auctionId: string;
  title: string;
  finalBidPaise: number;
}
export interface NotificationNewEvent {
  type: 'notification.new';
  notificationId: string;
}

export type RoomEvent = BidPlacedEvent | AuctionExtendedEvent | AuctionEndedEvent;
export type MemberEvent = BidOutbidEvent | AuctionWonEvent | NotificationNewEvent;
export type LiveEvent = RoomEvent | MemberEvent;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseBid(v: unknown): LiveBid | null {
  if (!isObj(v) || !str(v.id) || !num(v.amountPaise) || !str(v.createdAt) || typeof v.bidderLabel !== 'string') return null;
  return { id: v.id, amountPaise: v.amountPaise, createdAt: v.createdAt, bidderLabel: v.bidderLabel };
}

/** Validate one parsed frame. Returns null for anything that is not a known event (pong, error, junk). */
export function parseLiveEvent(raw: unknown): LiveEvent | null {
  if (!isObj(raw) || typeof raw.type !== 'string') return null;
  switch (raw.type) {
    case 'bid.placed': {
      const bid = parseBid(raw.bid);
      if (!bid || !str(raw.auctionId) || !num(raw.currentBidPaise) || !num(raw.bidCount) || !str(raw.endTime)) return null;
      return {
        type: 'bid.placed',
        auctionId: raw.auctionId,
        currentBidPaise: raw.currentBidPaise,
        bidCount: raw.bidCount,
        endTime: raw.endTime,
        highestBidderId: str(raw.highestBidderId) ? raw.highestBidderId : null,
        bid,
      };
    }
    case 'auction.extended':
      if (!str(raw.auctionId) || !str(raw.endTime)) return null;
      return { type: 'auction.extended', auctionId: raw.auctionId, endTime: raw.endTime };
    case 'auction.ended':
      if (!str(raw.auctionId) || !num(raw.finalBidPaise) || !num(raw.bidCount) || !str(raw.endedAt)) return null;
      return {
        type: 'auction.ended',
        auctionId: raw.auctionId,
        winnerId: str(raw.winnerId) ? raw.winnerId : null,
        finalBidPaise: raw.finalBidPaise,
        bidCount: raw.bidCount,
        endedAt: raw.endedAt,
      };
    case 'bid.outbid':
      if (!str(raw.auctionId) || typeof raw.title !== 'string' || !num(raw.currentBidPaise)) return null;
      return { type: 'bid.outbid', auctionId: raw.auctionId, title: raw.title, currentBidPaise: raw.currentBidPaise };
    case 'auction.won':
      if (!str(raw.auctionId) || typeof raw.title !== 'string' || !num(raw.finalBidPaise)) return null;
      return { type: 'auction.won', auctionId: raw.auctionId, title: raw.title, finalBidPaise: raw.finalBidPaise };
    case 'notification.new':
      if (!str(raw.notificationId)) return null;
      return { type: 'notification.new', notificationId: raw.notificationId };
    default:
      return null;
  }
}

export const isRoomEvent = (e: LiveEvent): e is RoomEvent =>
  e.type === 'bid.placed' || e.type === 'auction.extended' || e.type === 'auction.ended';
export const isMemberEvent = (e: LiveEvent): e is MemberEvent => !isRoomEvent(e);
