// "Moments of intent" that gate the push soft prompt and the install banner,
// so neither asks on a cold first visit. Browser-only; every storage access is
// wrapped because private mode / blocked storage throws.

const ENGAGED_KEY = 'noblebid-engaged';
const BID_KEY = 'noblebid-has-bid';
const VISITS_KEY = 'noblebid-visits';
const VISIT_SESSION_KEY = 'noblebid-visit-counted';
const EVENT = 'noblebid:engaged';

function read(key: string, storage: 'local' | 'session' = 'local'): string | null {
  try {
    return (storage === 'local' ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string, storage: 'local' | 'session' = 'local') {
  try {
    (storage === 'local' ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    /* storage blocked - the in-memory event still fires for this session */
  }
}

/** Call after the member's first successful bid or watchlist add (idempotent). */
export function recordEngagement(kind: 'bid' | 'watch') {
  if (typeof window === 'undefined') return;
  write(ENGAGED_KEY, '1');
  if (kind === 'bid') write(BID_KEY, '1');
  window.dispatchEvent(new CustomEvent(EVENT, { detail: kind }));
}

export const hasEngaged = () => read(ENGAGED_KEY) === '1';
export const hasPlacedBid = () => read(BID_KEY) === '1';

/** Counts one visit per browser session; returns the running total. */
export function countVisit(): number {
  if (read(VISIT_SESSION_KEY, 'session') !== '1') {
    write(VISIT_SESSION_KEY, '1', 'session');
    write(VISITS_KEY, String((Number(read(VISITS_KEY)) || 0) + 1));
  }
  return Number(read(VISITS_KEY)) || 0;
}

export function onEngagement(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
