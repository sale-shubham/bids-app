// Remembers a `?ref=` referral code for 30 days so it can be sent with signup.
// Storage can be blocked (private mode), so every access is wrapped.

const KEY = 'nb_ref';
export const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_RE = /^[A-Za-z0-9_-]{3,40}$/;

export function captureReferralCode(raw: string | null | undefined, now = Date.now()): string | null {
  const code = raw?.trim();
  if (!code || !CODE_RE.test(code)) return null;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, expires: now + REFERRAL_TTL_MS }));
  } catch {
    /* storage unavailable: the code is simply not remembered */
  }
  return code;
}

export function readReferralCode(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { code?: unknown; expires?: unknown };
    if (typeof v.code === 'string' && typeof v.expires === 'number' && v.expires > now && CODE_RE.test(v.code)) return v.code;
    localStorage.removeItem(KEY);
  } catch {
    /* unreadable: treat as none */
  }
  return null;
}

export function clearReferralCode(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
