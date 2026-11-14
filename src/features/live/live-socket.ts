// Framework-free WebSocket client for NobleBid live updates. One instance per tab.
import type { LiveMode, WsTicket } from './live.api';
import { parseLiveEvent, type LiveEvent, type LiveStatus } from './live.types';

const PING_MS = 4.5 * 60_000; // API Gateway idle timeout is 10 min
const BACKOFF_MIN_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
const HIDDEN_STOP_MS = 5 * 60_000;

export interface LiveSocketOptions {
  fetchTicket: (mode: LiveMode) => Promise<WsTicket>;
}

export class LiveSocket {
  private mode: LiveMode | null = null;
  private status: LiveStatus = 'idle';
  private ws: WebSocket | null = null;
  private auctionId: string | null = null;
  private backoff = BACKOFF_MIN_MS;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private hiddenTimer: ReturnType<typeof setTimeout> | undefined;
  private attempt = 0; // bumped to cancel in-flight connects
  private suspended = false; // stopped because the tab was hidden too long
  private eventListeners = new Set<(e: LiveEvent) => void>();
  private statusListeners = new Set<(s: LiveStatus) => void>();
  private openListeners = new Set<() => void>();
  private bound = false;

  constructor(private readonly opts: LiveSocketOptions) {}

  getStatus() {
    return this.status;
  }
  onEvent(fn: (e: LiveEvent) => void) {
    this.eventListeners.add(fn);
    return () => void this.eventListeners.delete(fn);
  }
  onStatus(fn: (s: LiveStatus) => void) {
    this.statusListeners.add(fn);
    return () => void this.statusListeners.delete(fn);
  }
  /** Fires on every successful (re)connect. */
  onOpen(fn: () => void) {
    this.openListeners.add(fn);
    return () => void this.openListeners.delete(fn);
  }

  /** Open as `mode`, or close when null. Changing mode reconnects with the right ticket kind. */
  setMode(mode: LiveMode | null) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.teardown();
    this.suspended = false;
    this.backoff = BACKOFF_MIN_MS;
    if (!mode) {
      this.unbind();
      this.setStatus('idle');
      return;
    }
    this.bind();
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') this.armHiddenTimer();
    void this.connect();
  }

  /** One auction room per connection; remembered and re-sent after every reconnect. */
  subscribe(auctionId: string) {
    this.auctionId = auctionId;
    this.send({ action: 'subscribe', auctionId });
  }
  unsubscribe(auctionId: string) {
    if (this.auctionId !== auctionId) return;
    this.auctionId = null;
    this.send({ action: 'unsubscribe' });
  }

  close() {
    this.setMode(null);
  }

  // --- internals ---------------------------------------------------------

  private setStatus(s: LiveStatus) {
    if (s === this.status) return;
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  private send(msg: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private async connect() {
    const mode = this.mode;
    if (!mode || this.suspended || this.ws) return;
    const attempt = ++this.attempt;
    clearTimeout(this.retryTimer);
    this.setStatus('connecting');
    let t: WsTicket;
    try {
      t = await this.opts.fetchTicket(mode);
    } catch {
      if (attempt === this.attempt) this.scheduleRetry();
      return;
    }
    if (attempt !== this.attempt) return;
    if (!t.wsUrl) {
      // Deploy-time fact (no live endpoint): nothing to retry, polling carries on.
      this.setStatus('unavailable');
      return;
    }
    if (!t.ticket) {
      this.scheduleRetry();
      return;
    }
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${t.wsUrl}?ticket=${encodeURIComponent(t.ticket)}`);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.backoff = BACKOFF_MIN_MS;
      this.setStatus('open');
      if (this.auctionId) this.send({ action: 'subscribe', auctionId: this.auctionId });
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.send({ action: 'ping' }), PING_MS);
      this.openListeners.forEach((l) => l());
    };
    ws.onmessage = (m) => {
      let raw: unknown;
      try {
        raw = JSON.parse(String(m.data));
      } catch {
        return;
      }
      const ev = parseLiveEvent(raw);
      if (ev) this.eventListeners.forEach((l) => l(ev));
    };
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      clearInterval(this.pingTimer);
      if (!this.mode || this.suspended) return;
      this.scheduleRetry();
    };
  }

  private scheduleRetry() {
    if (!this.mode || this.suspended) return;
    this.setStatus('closed');
    clearTimeout(this.retryTimer);
    const delay = this.backoff * (0.5 + Math.random() * 0.5); // jitter
    this.backoff = Math.min(this.backoff * 2, BACKOFF_MAX_MS);
    this.retryTimer = setTimeout(() => void this.connect(), delay);
  }

  /** Drop the socket and timers without touching mode/subscription. */
  private teardown() {
    this.attempt++;
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    clearTimeout(this.hiddenTimer);
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      try {
        ws.close(1000);
      } catch {
        /* already closed */
      }
    }
  }

  private armHiddenTimer() {
    clearTimeout(this.hiddenTimer);
    this.hiddenTimer = setTimeout(() => {
      this.suspended = true;
      this.teardown();
      this.setStatus('closed');
    }, HIDDEN_STOP_MS);
  }

  private resume() {
    if (!this.mode) return;
    clearTimeout(this.hiddenTimer);
    this.suspended = false;
    if (!this.ws && this.status !== 'unavailable') {
      this.backoff = BACKOFF_MIN_MS;
      void this.connect();
    }
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible') this.resume();
    else if (this.mode) this.armHiddenTimer();
  };
  private onOnline = () => this.resume();

  private bind() {
    if (this.bound || typeof window === 'undefined') return;
    this.bound = true;
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('online', this.onOnline);
  }
  private unbind() {
    if (!this.bound) return;
    this.bound = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('online', this.onOnline);
  }
}
