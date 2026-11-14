import { api } from '@/lib/api-client';

export interface WsTicket {
  ticket: string;
  /** null = this environment has no live endpoint (keep polling). */
  wsUrl: string | null;
}

export type LiveMode = 'member' | 'guest';

/** Single-use, 60 s. Every connect attempt needs a fresh one. */
export async function fetchWsTicket(mode: LiveMode): Promise<WsTicket> {
  const res = await api.post(mode === 'member' ? '/ws/ticket' : '/ws/guest-ticket');
  const d = (res.data?.data ?? {}) as Partial<WsTicket>;
  return {
    ticket: typeof d.ticket === 'string' ? d.ticket : '',
    wsUrl: typeof d.wsUrl === 'string' && d.wsUrl ? d.wsUrl : null,
  };
}
