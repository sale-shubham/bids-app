import { api } from '@/lib/api-client';
import { parsePaged, type Paged } from '@/lib/paged';
import type { CreditEntry, ReferralSummary } from './referrals.types';

export const CREDITS_PAGE_SIZE = 20;

const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export async function fetchReferral(): Promise<ReferralSummary> {
  const res = await api.get('/members/me/referral');
  const d = obj(res.data?.data);
  const c = obj(d.counts);
  return {
    code: String(d.code ?? ''),
    link: String(d.link ?? ''),
    rewardPaise: num(d.rewardPaise),
    enabled: d.enabled !== false,
    counts: { pending: num(c.pending), qualified: num(c.qualified), rewarded: num(c.rewarded), rejected: num(c.rejected) },
    creditBalancePaise: num(d.creditBalancePaise),
  };
}

export async function fetchCredits(page: number): Promise<Paged<CreditEntry>> {
  const res = await api.get('/members/me/credits', { params: { page, pageSize: CREDITS_PAGE_SIZE } });
  return parsePaged<CreditEntry>(res.data);
}
